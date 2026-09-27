import React, { createContext, useContext, useState } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '../../store/AppContext';
import { darkTheme } from '../../theme/theme';

interface CommandContextType {
  search: string;
  setSearch: (s: string) => void;
}

const CommandContext = createContext<CommandContextType>({
  search: '',
  setSearch: () => {},
});

export function Command({
  style,
  children,
}: {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const [search, setSearch] = useState('');
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <CommandContext.Provider value={{ search, setSearch }}>
      <View
        style={[
          styles.command,
          {
            backgroundColor: theme.cardBackground,
            borderColor: theme.border,
          },
          style,
        ]}>
        {children}
      </View>
    </CommandContext.Provider>
  );
}

export function CommandInput({
  placeholder = 'Type a command or search...',
  style,
}: {
  placeholder?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { search, setSearch } = useContext(CommandContext);
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View style={[styles.inputWrapper, { borderBottomColor: theme.border }]}>
      <Text style={[styles.searchIcon, { color: theme.textSecondary }]}>🔍</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={placeholder}
        placeholderTextColor={theme.placeholderText}
        style={[
          styles.input,
          { color: theme.textPrimary },
          style,
        ]}
      />
    </View>
  );
}

export function CommandList({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <ScrollView
      style={[styles.list, style]}
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  );
}

export function CommandEmpty({
  children,
}: {
  children: React.ReactNode;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View style={styles.empty}>
      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>{children}</Text>
    </View>
  );
}

export function CommandGroup({
  heading,
  children,
}: {
  heading?: string;
  children: React.ReactNode;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View style={styles.group}>
      {heading && (
        <Text style={[styles.heading, { color: theme.textSecondary }]}>
          {heading}
        </Text>
      )}
      {children}
    </View>
  );
}

export function CommandSeparator({ style }: { style?: StyleProp<ViewStyle> }) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <View
      style={[
        styles.separator,
        { backgroundColor: theme.border },
        style,
      ]}
    />
  );
}

export function CommandItem({
  children,
  onSelect,
  disabled,
  style,
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  let theme = darkTheme;
  try {
    const app = useApp();
    if (app && app.theme) theme = app.theme;
  } catch {}

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onSelect}
      style={[
        styles.item,
        { opacity: disabled ? 0.4 : 1 },
        style,
      ]}>
      {typeof children === 'string' ? (
        <Text style={[styles.itemText, { color: theme.textPrimary }]}>
          {children}
        </Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  command: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: 380,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    height: 48,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  list: {
    padding: 6,
  },
  empty: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: {
    marginBottom: 8,
  },
  heading: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 6,
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  itemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  separator: {
    height: 1,
    marginVertical: 4,
  },
});
