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
import { describeTool } from '../relay/feed';

const monoFont = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

interface Props {
  prompt: PendingPrompt;
  theme: ThemeColors;
  onAnswer: (allow: boolean) => void;
  onAnswerQuestions: (answers: Record<string, string[]> | null) => void;
}

/** The CLI is waiting on the user: Allow/Deny, or a picker for AskUserQuestion. */
export function PromptCard({
  prompt,
  theme,
  onAnswer,
  onAnswerQuestions,
}: Props) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.cardBackground, borderColor: theme.warning },
      ]}
      accessibilityLiveRegion="polite"
    >
      {prompt.questions ? (
        <QuestionPicker
          prompt={prompt}
          theme={theme}
          onAnswer={onAnswerQuestions}
        />
      ) : (
        <PermissionBody prompt={prompt} theme={theme} onAnswer={onAnswer} />
      )}
    </View>
  );
}

function PermissionBody({
  prompt,
  theme,
  onAnswer,
}: {
  prompt: PendingPrompt;
  theme: ThemeColors;
  onAnswer: (allow: boolean) => void;
}) {
  const summary = describeTool({
    name: prompt.toolName,
    input: prompt.input,
    status: 'running',
  });
  return (
    <>
      <Text style={[styles.eyebrow, { color: theme.warning }]}>
        PERMISSION REQUIRED
      </Text>
      <Text style={[styles.title, { color: theme.textPrimary }]}>
        Allow {prompt.toolName}?
      </Text>
      <View
        style={[styles.commandBox, { backgroundColor: theme.codeBackground }]}
      >
        <Text
          selectable
          numberOfLines={6}
          style={[styles.command, { color: theme.textPrimary }]}
        >
          {summary}
        </Text>
      </View>
      {prompt.description ? (
        <Text
          numberOfLines={3}
          style={[styles.description, { color: theme.textSecondary }]}
        >
          {prompt.description}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Deny ${prompt.toolName}`}
          onPress={() => onAnswer(false)}
          style={[styles.secondaryBtn, { borderColor: theme.outline }]}
        >
          <CloseIcon size={13} color={theme.error} />
          <Text style={[styles.btnText, { color: theme.error }]}>Deny</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Allow ${prompt.toolName}`}
          onPress={() => onAnswer(true)}
          style={[styles.primaryBtn, { backgroundColor: theme.textPrimary }]}
        >
          <CheckmarkIcon size={13} color={theme.background} />
          <Text style={[styles.btnText, { color: theme.background }]}>
            Allow
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
  const questions = prompt.questions || [];
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

  const complete = questions.every(q => (answers[q.question] || []).length > 0);

  return (
    <>
      <Text style={[styles.eyebrow, { color: theme.warning }]}>
        YOUR LAPTOP IS ASKING
      </Text>
      <ScrollView style={styles.questionScroll} nestedScrollEnabled>
        {questions.map(q => (
          <View key={q.question} style={styles.question}>
            {q.header ? (
              <Text style={[styles.header, { color: theme.textMuted }]}>
                {q.header}
              </Text>
            ) : null}
            <Text style={[styles.title, { color: theme.textPrimary }]}>
              {q.question}
            </Text>
            {q.options.map(option => {
              const selected = (answers[q.question] || []).includes(
                option.label,
              );
              return (
                <TouchableOpacity
                  key={option.label}
                  activeOpacity={0.7}
                  accessibilityRole={q.multiSelect ? 'checkbox' : 'radio'}
                  accessibilityState={{ checked: selected }}
                  onPress={() =>
                    toggle(q.question, option.label, !!q.multiSelect)
                  }
                  style={[
                    styles.option,
                    {
                      borderColor: selected ? theme.textPrimary : theme.outline,
                      backgroundColor: selected
                        ? theme.pillBackground
                        : undefined,
                    },
                  ]}
                >
                  <View
                    style={[
                      q.multiSelect ? styles.checkbox : styles.radio,
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
                          q.multiSelect
                            ? styles.checkboxFill
                            : styles.radioFill,
                          { backgroundColor: theme.textPrimary },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.optionText}>
                    <Text
                      style={[styles.optionLabel, { color: theme.textPrimary }]}
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
        ))}
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
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  primaryBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnText: {
    fontWeight: '700',
    fontSize: 13,
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
