import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../components/common/AppHeader';
import { useApp } from '../store/AppContext';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { theme, profile, updateProfile, goBack } = useApp();

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [organization, setOrganization] = useState(profile.organization);

  const handleSave = () => {
    updateProfile({
      name: name.trim(),
      email: email.trim(),
      organization: organization.trim(),
    });
    Alert.alert('Profile Saved', 'Your profile details have been updated.');
    goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader showBack title="Profile" />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 24) },
        ]}>
        {/* Avatar Card */}
        <View
          style={[
            styles.avatarCard,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <View style={[styles.avatarBig, { backgroundColor: theme.primary }]}>
            <Text style={styles.avatarBigText}>
              {name ? name[0].toUpperCase() : 'P'}
            </Text>
          </View>
          <Text style={[styles.planBadge, { color: theme.tagText }]}>
            {profile.plan} Plan
          </Text>
        </View>

        {/* Form Inputs */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.secondaryBackground,
              borderColor: theme.border,
            },
          ]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.textPrimary,
                borderColor: theme.border,
              },
            ]}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Email
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.textPrimary,
                borderColor: theme.border,
              },
            ]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Organization
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.textPrimary,
                borderColor: theme.border,
              },
            ]}
            value={organization}
            onChangeText={setOrganization}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            Sign-in Provider
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.textSecondary,
                borderColor: theme.border,
              },
            ]}
            value={profile.provider}
            editable={false}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>
            User ID
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.background,
                color: theme.textSecondary,
                borderColor: theme.border,
              },
            ]}
            value={profile.userId}
            editable={false}
          />

          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.saveBtnText}>Save Profile</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  avatarCard: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  avatarBig: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarBigText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
  },
  planBadge: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  card: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  input: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  saveBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
