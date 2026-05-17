import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../../src/auth/AuthContext';
import type { CompanyAccess } from '../../src/auth/authTypes';
import { useCompany } from '../../src/companies/CompanyContext';
import {
  createSupportRequest,
  fetchSupportRequests,
} from '../../src/companies/companiesApi';
import type {
  CreateSupportRequestInput,
  SupportRequest,
} from '../../src/companies/companiesTypes';
import { AppScreen } from '../../src/components/AppScreen';
import { colors } from '../../src/theme/colors';
import { radius, spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

// --- Label helpers -------------------------------------------------------

const TYPE_OPTIONS: { value: CreateSupportRequestInput['type']; label: string }[] =
  [
    { value: 'technical', label: 'Technique' },
    { value: 'modification', label: 'Modification' },
    { value: 'billing', label: 'Facturation' },
    { value: 'other', label: 'Autre' },
  ];

const PRIORITY_OPTIONS: {
  value: CreateSupportRequestInput['priority'];
  label: string;
}[] = [
  { value: 'low', label: 'Basse' },
  { value: 'normal', label: 'Normale' },
  { value: 'high', label: 'Haute' },
  { value: 'urgent', label: 'Urgente' },
];

function labelForType(type: string): string {
  return TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

function labelForPriority(priority: string): string {
  return PRIORITY_OPTIONS.find((o) => o.value === priority)?.label ?? priority;
}

function labelForStatus(status: string): string {
  switch (status) {
    case 'open':
      return 'Ouvert';
    case 'in_progress':
      return 'En cours';
    case 'resolved':
      return 'Résolu';
    case 'closed':
      return 'Fermé';
    default:
      return status;
  }
}

function colorForStatus(status: string): string {
  switch (status) {
    case 'open':
      return colors.primary;
    case 'in_progress':
      return '#B97A2A';
    case 'resolved':
      return colors.textMuted;
    case 'closed':
      return colors.border;
    default:
      return colors.textMuted;
  }
}

function colorForPriority(priority: string): string {
  switch (priority) {
    case 'urgent':
      return '#8A2A1B';
    case 'high':
      return '#B97A2A';
    case 'normal':
      return colors.textSecondary;
    case 'low':
      return colors.textMuted;
    default:
      return colors.textMuted;
  }
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-BE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

// --- Screen state --------------------------------------------------------

// listLoading allows silent list refresh after submit without wiping the form.
type ScreenState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'no_company' }
  | {
      kind: 'ready';
      company: CompanyAccess;
      tickets: SupportRequest[];
      listLoading: boolean;
    };

// --- Sub-components ------------------------------------------------------

function ChipSelector<T extends string>({
  options,
  selected,
  onSelect,
  disabled,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          style={[
            styles.chip,
            selected === opt.value && styles.chipSelected,
            disabled && styles.chipDisabled,
          ]}
          onPress={() => !disabled && onSelect(opt.value)}
        >
          <Text
            style={[
              styles.chipLabel,
              selected === opt.value && styles.chipLabelSelected,
            ]}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function TicketCard({ ticket }: { ticket: SupportRequest }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{ticket.title}</Text>

      <View style={styles.cardMeta}>
        <Text style={styles.cardMetaText}>{labelForType(ticket.type)}</Text>
        <Text style={styles.cardDot}> · </Text>
        <Text
          style={[
            styles.cardMetaText,
            { color: colorForPriority(ticket.priority) },
          ]}
        >
          {labelForPriority(ticket.priority)}
        </Text>
        <Text style={styles.cardDot}> · </Text>
        <Text
          style={[
            styles.cardMetaText,
            styles.cardMetaBold,
            { color: colorForStatus(ticket.status) },
          ]}
        >
          {labelForStatus(ticket.status)}
        </Text>
      </View>

      <Text style={styles.cardMessage} numberOfLines={2}>
        {ticket.message}
      </Text>

      <Text style={styles.cardDate}>{formatDate(ticket.createdAt)}</Text>
    </View>
  );
}

// --- Screen --------------------------------------------------------------

export default function SupportScreen() {
  const { authenticatedRequest } = useAuth();
  const { selectedCompany, isLoadingCompanies, companyError, refreshCompanies } = useCompany();

  // Screen state
  const [state, setState] = useState<ScreenState>({ kind: 'loading' });

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedType, setSelectedType] =
    useState<CreateSupportRequestInput['type']>('other');
  const [selectedPriority, setSelectedPriority] =
    useState<CreateSupportRequestInput['priority']>('normal');
  const [submitting, setSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Load tickets for the selected company.
  const load = useCallback(async () => {
    if (!selectedCompany) return;
    setState({ kind: 'loading' });
    try {
      const data = await fetchSupportRequests(
        selectedCompany.id,
        authenticatedRequest,
        20,
      );
      setState({
        kind: 'ready',
        company: selectedCompany,
        tickets: data.supportRequests,
        listLoading: false,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Une erreur est survenue.';
      setState({ kind: 'error', message: msg });
    }
  }, [selectedCompany, authenticatedRequest]);

  // Silent list refresh after ticket creation — keeps the form visible.
  const reloadTickets = useCallback(
    async (companyId: string) => {
      setState((prev) =>
        prev.kind === 'ready' ? { ...prev, listLoading: true } : prev,
      );
      try {
        const data = await fetchSupportRequests(
          companyId,
          authenticatedRequest,
          20,
        );
        setState((prev) =>
          prev.kind === 'ready'
            ? { ...prev, tickets: data.supportRequests, listLoading: false }
            : prev,
        );
      } catch {
        // Silent fail — existing list stays visible.
        setState((prev) =>
          prev.kind === 'ready' ? { ...prev, listLoading: false } : prev,
        );
      }
    },
    [authenticatedRequest],
  );

  const handleSubmit = useCallback(async () => {
    if (submitting || state.kind !== 'ready') return;

    // Client-side validation mirrors backend Zod constraints.
    if (title.trim().length < 3) {
      setFormError('Le titre doit comporter au moins 3 caractères.');
      return;
    }
    if (message.trim().length < 5) {
      setFormError('Le message doit comporter au moins 5 caractères.');
      return;
    }

    setFormError(null);
    setSubmitSuccess(false);
    setSubmitting(true);

    const companyId = state.company.id;

    try {
      await createSupportRequest(companyId, authenticatedRequest, {
        title: title.trim(),
        message: message.trim(),
        type: selectedType,
        priority: selectedPriority,
        // projectId is not sent — not surfaced in V1 UI.
        // company_id, created_by_user_id, status are set server-side from JWT/params.
      });

      // Reset form after success.
      setTitle('');
      setMessage('');
      setSelectedType('other');
      setSelectedPriority('normal');
      setSubmitSuccess(true);

      // Silent reload of ticket list.
      await reloadTickets(companyId);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Une erreur est survenue.',
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    state,
    title,
    message,
    selectedType,
    selectedPriority,
    authenticatedRequest,
    reloadTickets,
  ]);

  // Pull-to-refresh — refreshes ticket list without resetting state to loading.
  // Works from both ready and error states.
  const onRefresh = useCallback(async () => {
    if (!selectedCompany) return;
    setIsRefreshing(true);
    try {
      const data = await fetchSupportRequests(
        selectedCompany.id,
        authenticatedRequest,
        20,
      );
      setState((prev) =>
        prev.kind === 'ready'
          ? { ...prev, tickets: data.supportRequests, listLoading: false }
          : {
              kind: 'ready',
              company: selectedCompany,
              tickets: data.supportRequests,
              listLoading: false,
            },
      );
    } catch {
      // Silent fail — existing data stays visible.
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedCompany, authenticatedRequest]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>SUPPORT</Text>
        <Text style={styles.title}>Demander de l&apos;aide</Text>
      </View>

      {/* ── Global states (company loading/error) ─────────── */}

      {isLoadingCompanies && (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {companyError && (
        <View style={styles.section}>
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>
              Impossible de charger les entreprises
            </Text>
            <Text style={styles.errorMessage}>{companyError}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.outlineButton,
              pressed && styles.outlineButtonPressed,
            ]}
            onPress={refreshCompanies}
          >
            <Text style={styles.outlineButtonLabel}>Réessayer</Text>
          </Pressable>
        </View>
      )}

      {!isLoadingCompanies && !companyError && !selectedCompany && (
        <View style={styles.section}>
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Aucune entreprise active associée à votre compte.
            </Text>
          </View>
        </View>
      )}

      {/* ── Local states (support data) ──────────────────── */}

      {!isLoadingCompanies && !companyError && selectedCompany && (
        <>
          {state.kind === 'loading' && (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}

          {state.kind === 'error' && (
            <View style={styles.section}>
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>
                  Impossible de charger le support
                </Text>
                <Text style={styles.errorMessage}>{state.message}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.outlineButton,
                  pressed && styles.outlineButtonPressed,
                ]}
                onPress={load}
              >
                <Text style={styles.outlineButtonLabel}>Réessayer</Text>
              </Pressable>
            </View>
          )}

          {state.kind === 'ready' && (
            <>
              <Text style={styles.companyLabel}>
                {state.company.name.toUpperCase()}
              </Text>

              {/* Form */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Nouvelle demande</Text>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Titre</Text>
                  <TextInput
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Ex : Problème sur la page d'accueil"
                    placeholderTextColor={colors.textMuted}
                    autoCorrect={false}
                    editable={!submitting}
                    maxLength={200}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Message</Text>
                  <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Décrivez votre demande en détail..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    autoCorrect={false}
                    editable={!submitting}
                    maxLength={5000}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Type</Text>
                  <ChipSelector
                    options={TYPE_OPTIONS}
                    selected={selectedType}
                    onSelect={setSelectedType}
                    disabled={submitting}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Priorité</Text>
                  <ChipSelector
                    options={PRIORITY_OPTIONS}
                    selected={selectedPriority}
                    onSelect={setSelectedPriority}
                    disabled={submitting}
                  />
                </View>

                {formError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorMessage}>{formError}</Text>
                  </View>
                ) : null}

                {submitSuccess ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>
                      Demande envoyée avec succès.
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                    submitting && styles.primaryButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonLabel}>
                      Envoyer la demande
                    </Text>
                  )}
                </Pressable>
              </View>

              {/* Ticket list */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Demandes récentes</Text>
                  {state.listLoading && (
                    <ActivityIndicator
                      color={colors.primary}
                      size="small"
                      style={styles.listSpinner}
                    />
                  )}
                </View>

                {state.tickets.length === 0 && !state.listLoading ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>
                      Aucune demande support pour le moment.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.list}>
                    {state.tickets.map((ticket) => (
                      <TicketCard key={ticket.id} ticket={ticket} />
                    ))}
                  </View>
                )}
              </View>
            </>
          )}
        </>
      )}
    </AppScreen>
  );
}

// --- Styles --------------------------------------------------------------

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  eyebrow: {
    ...typography.small,
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  title: {
    ...typography.display,
    color: colors.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xxxl,
  },
  companyLabel: {
    ...typography.small,
    color: colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
  },
  section: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  listSpinner: {
    marginLeft: spacing.xs,
  },
  // Form fields
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  // Chip selector
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Buttons
  primaryButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryButtonPressed: {
    backgroundColor: colors.primarySoft,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  outlineButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  outlineButtonPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  outlineButtonLabel: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  // Ticket card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  cardTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cardMetaText: {
    ...typography.small,
    color: colors.textMuted,
  },
  cardMetaBold: {
    fontWeight: '600',
  },
  cardDot: {
    ...typography.small,
    color: colors.textMuted,
  },
  cardMessage: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardDate: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  // States
  errorBox: {
    backgroundColor: '#FBEEEC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6BFB7',
    borderRadius: radius.md,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  errorTitle: {
    ...typography.sectionTitle,
    color: '#8A2A1B',
  },
  errorMessage: {
    ...typography.small,
    color: '#8A2A1B',
  },
  successBox: {
    backgroundColor: '#EAF3EC',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#B3D4B8',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  successText: {
    ...typography.small,
    color: colors.primary,
    fontWeight: '500',
  },
  emptyBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radius.md,
    padding: spacing.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  list: {
    gap: spacing.md,
  },
});
