import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CheckmarkIcon, CloseIcon } from '../../../components/common/Icons';
import { ThemeColors } from '../../../theme/theme';
import type { PendingPrompt } from '../relay/protocol';
import { describeTool, toolKind } from '../relay/feed';

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

function safeRenderString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (val && typeof val === 'object') {
    const obj = val as Record<string, any>;
    if (typeof obj.text === 'string') return obj.text;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.description === 'string') return obj.description;
    if (typeof obj.reason === 'string') return obj.reason;
    try {
      return JSON.stringify(val);
    } catch {
      return '';
    }
  }
  return '';
}

interface Props {
  prompt: PendingPrompt;
  theme: ThemeColors;
  onAnswer: (allow: boolean | 'always') => void;
  onAnswerQuestions: (answers: Record<string, string[]> | null) => void;
}

class PromptCardErrorBoundary extends React.Component<
  {
    theme: ThemeColors;
    onAnswer: (allow: boolean | 'always') => void;
    children: React.ReactNode;
  },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: any) {
    console.warn('PromptCard render error caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const { theme, onAnswer } = this.props;
      return (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.cardBackground, borderColor: theme.warning },
          ]}
        >
          <Text style={[styles.eyebrow, { color: theme.warning }]}>
            PERMISSION REQUIRED
          </Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Permission prompt
          </Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            A tool request is waiting for your approval.
          </Text>
          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onAnswer(false)}
              style={[styles.secondaryBtn, { borderColor: theme.outline }]}
            >
              <CloseIcon size={13} color={theme.error} />
              <Text style={[styles.btnText, { color: theme.error }]}>Deny</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onAnswer(true)}
              style={[styles.primaryBtn, { backgroundColor: theme.textPrimary }]}
            >
              <CheckmarkIcon size={13} color={theme.background} />
              <Text style={[styles.btnText, { color: theme.background }]}>
                Allow
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

/** The CLI is waiting on the user: Allow/Deny, or a picker for AskUserQuestion. */
export function PromptCard({
  prompt,
  theme,
  onAnswer,
  onAnswerQuestions,
}: Props) {
  const hasQuestions =
    Array.isArray(prompt.questions) && prompt.questions.length > 0;

  return (
    <PromptCardErrorBoundary theme={theme} onAnswer={onAnswer}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.cardBackground, borderColor: theme.warning },
        ]}
        accessibilityLiveRegion="polite"
      >
        {hasQuestions ? (
          <QuestionPicker
            prompt={prompt}
            theme={theme}
            onAnswer={onAnswerQuestions}
          />
        ) : (
          <PermissionBody prompt={prompt} theme={theme} onAnswer={onAnswer} />
        )}
      </View>
    </PromptCardErrorBoundary>
  );
}

function PermissionBody({
  prompt,
  theme,
  onAnswer,
}: {
  prompt: PendingPrompt;
  theme: ThemeColors;
  onAnswer: (allow: boolean | 'always') => void;
}) {
  const toolName = safeRenderString(prompt.toolName) || 'Tool';
  const isExitPlanMode = toolName.toLowerCase() === 'exitplanmode';
  const kind = toolKind(toolName);
  const isEdit = kind === 'edit';
  const isRead = kind === 'read';
  const isCommand = kind === 'command';

  let summary = '';
  try {
    summary = describeTool({
      name: toolName,
      input:
        prompt.input && typeof prompt.input === 'object' ? prompt.input : {},
      status: 'running',
    });
  } catch {
    summary = toolName;
  }

  const descriptionRaw =
    prompt.description ||
    (prompt.input && typeof prompt.input === 'object'
      ? prompt.input.description || prompt.input.reason || prompt.input.message
      : '');
  const descriptionText = safeRenderString(descriptionRaw).trim();

  const filePath = safeRenderString(
    prompt.input?.file_path ||
      prompt.input?.path ||
      prompt.input?.notebook_path ||
      prompt.input?.file ||
      prompt.input?.filename ||
      prompt.input?.target_file ||
      prompt.input?.targetFile ||
      '',
  );
  const fileBasename = filePath.split('/').filter(Boolean).pop() || filePath;
  const isWrite =
    toolName.toLowerCase().includes('write') || Boolean(prompt.input?.content);

  const eyebrowText = isExitPlanMode
    ? 'PLAN READY FOR APPROVAL'
    : 'PERMISSION REQUIRED';

  const titleText = isExitPlanMode
    ? 'Ready to start coding?'
    : isEdit
    ? fileBasename
      ? `Allow Puku to ${isWrite ? 'write' : 'edit'} ${fileBasename}?`
      : `Allow ${toolName}?`
    : isRead
    ? fileBasename
      ? `Allow Puku to read ${fileBasename}?`
      : `Allow ${toolName}?`
    : isCommand
    ? 'Allow running command?'
    : `Allow ${toolName}?`;

  const commandText = isExitPlanMode
    ? safeRenderString(prompt.input?.plan || descriptionText || summary)
    : isCommand
    ? safeRenderString(
        prompt.input?.command ||
          prompt.input?.cmd ||
          prompt.input?.CommandLine ||
          prompt.input?.commandLine ||
          summary,
      )
    : isEdit || isRead
    ? filePath
      ? `${filePath}${
          prompt.input?.content
            ? `\n\n${safeRenderString(prompt.input.content).slice(0, 300)}`
            : prompt.input?.new_string
            ? `\n\n${safeRenderString(prompt.input.new_string).slice(0, 300)}`
            : ''
        }`
      : safeRenderString(summary)
    : safeRenderString(summary);

  return (
    <>
      <Text style={[styles.eyebrow, { color: theme.warning }]}>
        {eyebrowText}
      </Text>
      <Text style={[styles.title, { color: theme.textPrimary }]}>
        {titleText}
      </Text>
      <View
        style={[styles.commandBox, { backgroundColor: theme.codeBackground }]}
      >
        <Text
          selectable
          numberOfLines={6}
          style={[styles.command, { color: theme.textPrimary }]}
        >
          {commandText}
        </Text>
      </View>
      {descriptionText && !isExitPlanMode ? (
        <Text
          numberOfLines={3}
          style={[styles.description, { color: theme.textSecondary }]}
        >
          {descriptionText}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Deny ${toolName}`}
          onPress={() => onAnswer(false)}
          style={[styles.secondaryBtn, { borderColor: theme.outline }]}
        >
          <CloseIcon size={13} color={theme.error} />
          <Text style={[styles.btnText, { color: theme.error }]}>
            {isExitPlanMode ? 'Reject' : 'Deny'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Allow ${toolName} once`}
          onPress={() => onAnswer(true)}
          style={[
            styles.allowOnceBtn,
            {
              borderColor: theme.outline,
              backgroundColor: theme.pillBackground,
            },
          ]}
        >
          <Text style={[styles.btnText, { color: theme.textPrimary }]}>
            {isExitPlanMode ? 'Start Coding' : 'Allow Once'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Always allow ${toolName}`}
          onPress={() => onAnswer('always')}
          style={[styles.primaryBtn, { backgroundColor: theme.textPrimary }]}
        >
          <CheckmarkIcon size={13} color={theme.background} />
          <Text style={[styles.btnText, { color: theme.background }]}>
            {isExitPlanMode ? 'Autopilot' : 'Always'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function QuestionPicker({
  prompt,
  theme,
  onAnswer,
}: {
  prompt: PendingPrompt;
  theme: ThemeColors;
  onAnswer: (answers: Record<string, string[]> | null) => void;
}) {
  const rawQuestions = Array.isArray(prompt.questions) ? prompt.questions : [];
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  // A new prompt starts with no selections.
  useEffect(() => setAnswers({}), [prompt.requestId]);

  const toggle = (question: string, label: string, multi: boolean) => {
    setAnswers(prev => {
      const current = prev[question] || [];
      const next = multi
        ? current.includes(label)
          ? current.filter(l => l !== label)
          : [...current, label]
        : [label];
      return { ...prev, [question]: next };
    });
  };

  const complete =
    rawQuestions.length > 0 &&
    rawQuestions.every(q => {
      const qKey = safeRenderString(q?.question);
      return (answers[qKey] || []).length > 0;
    });

  return (
    <>
      <Text style={[styles.eyebrow, { color: theme.warning }]}>
        YOUR LAPTOP IS ASKING
      </Text>
      <ScrollView style={styles.questionScroll} nestedScrollEnabled>
        {rawQuestions.map((q, qIdx) => {
          const qText = safeRenderString(q?.question) || `Question ${qIdx + 1}`;
          const qHeader = q?.header ? safeRenderString(q.header) : '';
          const isMulti = Boolean(q?.multiSelect);
          const rawOptions = Array.isArray(q?.options) ? q.options : [];
          const options = rawOptions
            .map((opt: any, optIdx: number) => {
              if (typeof opt === 'string') {
                return { label: opt, description: '' };
              }
              if (opt && typeof opt === 'object') {
                return {
                  label:
                    safeRenderString(opt.label || opt.text || opt.title) ||
                    `Option ${optIdx + 1}`,
                  description: safeRenderString(opt.description),
                };
              }
              return {
                label: safeRenderString(opt) || `Option ${optIdx + 1}`,
                description: '',
              };
            })
            .filter(opt => Boolean(opt.label));

          return (
            <View key={`${qText}_${qIdx}`} style={styles.question}>
              {qHeader ? (
                <Text style={[styles.header, { color: theme.textMuted }]}>
                  {qHeader}
                </Text>
              ) : null}
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                {qText}
              </Text>
              {options.map((option, optIdx) => {
                const selected = (answers[qText] || []).includes(option.label);
                return (
                  <TouchableOpacity
                    key={`${option.label}_${optIdx}`}
                    activeOpacity={0.7}
                    accessibilityRole={isMulti ? 'checkbox' : 'radio'}
                    accessibilityState={{ checked: selected }}
                    onPress={() => toggle(qText, option.label, isMulti)}
                    style={[
                      styles.option,
                      {
                        borderColor: selected
                          ? theme.textPrimary
                          : theme.outline,
                        backgroundColor: selected
                          ? theme.pillBackground
                          : undefined,
                      },
                    ]}
                  >
                    <View
                      style={[
                        isMulti ? styles.checkbox : styles.radio,
                        {
                          borderColor: selected
                            ? theme.textPrimary
                            : theme.textMuted,
                        },
                      ]}
                    >
                      {selected && (
                        <View
                          style={[
                            isMulti ? styles.checkboxFill : styles.radioFill,
                            { backgroundColor: theme.textPrimary },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.optionText}>
                      <Text
                        style={[
                          styles.optionLabel,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {option.label}
                      </Text>
                      {option.description ? (
                        <Text
                          style={[
                            styles.optionDescription,
                            { color: theme.textMuted },
                          ]}
                        >
                          {option.description}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          onPress={() => onAnswer(null)}
          style={[styles.secondaryBtn, { borderColor: theme.outline }]}
        >
          <Text style={[styles.btnText, { color: theme.textSecondary }]}>
            Skip
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ disabled: !complete }}
          disabled={!complete}
          onPress={() => onAnswer(answers)}
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.textPrimary },
            !complete && styles.disabled,
          ]}
        >
          <Text style={[styles.btnText, { color: theme.background }]}>
            Submit
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  header: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  commandBox: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  command: {
    fontFamily: monoFont,
    fontSize: 12.5,
    lineHeight: 18,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  allowOnceBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  primaryBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: {
    fontWeight: '700',
    fontSize: 12.5,
  },
  disabled: {
    opacity: 0.4,
  },
  questionScroll: {
    maxHeight: 320,
  },
  question: {
    marginBottom: 10,
    gap: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioFill: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxFill: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  optionText: {
    flex: 1,
    marginLeft: 10,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 12,
    marginTop: 1,
  },
});
