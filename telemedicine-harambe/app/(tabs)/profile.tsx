import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { authAPI } from '../../services/api';

interface UserProfile {
  _id: string;
  name: string;
  email: string;
  phoneNumber?: string;
  role: string;
  age?: number;
  gender?: string;
  specialty?: string;
  createdAt: string;
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phoneNumber: '',
    age: '',
    gender: 'male',
    specialty: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getProfile();
      setProfile(response.data);
      setEditForm({
        name: response.data.name || '',
        phoneNumber: response.data.phoneNumber || '',
        age: response.data.age ? response.data.age.toString() : '',
        gender: response.data.gender || 'male',
        specialty: response.data.specialty || '',
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleUpdateProfile = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    try {
      const updateData = {
        name: editForm.name,
        phoneNumber: editForm.phoneNumber || undefined,
        age: editForm.age ? parseInt(editForm.age) : undefined,
        gender: editForm.gender,
        specialty: user?.role === 'doctor' ? editForm.specialty : undefined,
      };

      const response = await authAPI.updateProfile(updateData);
      setProfile(response.data.user);
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters long');
      return;
    }

    try {
      await authAPI.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      
      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordModal(false);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to change password');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              Alert.alert('Success', 'You have been logged out successfully');
              router.replace('/auth/login');
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return '#e74c3c';
      case 'doctor':
        return '#3498db';
      case 'patient':
        return '#27ae60';
      default:
        return '#7f8c8d';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <Text style={styles.subtitle}>Manage your account information</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color="#3498db" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile.name}</Text>
              <Text style={styles.profileEmail}>{profile.email}</Text>
              <View style={[styles.roleBadge, { backgroundColor: getRoleColor(profile.role) }]}>
                <Text style={styles.roleText}>{profile.role}</Text>
              </View>
            </View>
          </View>

          <View style={styles.profileDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Phone Number</Text>
              <Text style={styles.detailValue}>
                {profile.phoneNumber || 'Not provided'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Age</Text>
              <Text style={styles.detailValue}>
                {profile.age ? `${profile.age} years` : 'Not provided'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gender</Text>
              <Text style={styles.detailValue}>
                {profile.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Not provided'}
              </Text>
            </View>

            {profile.specialty && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Specialty</Text>
                <Text style={styles.detailValue}>{profile.specialty}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Member Since</Text>
              <Text style={styles.detailValue}>{formatDate(profile.createdAt)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowEditModal(true)}
          >
            <Ionicons name="create-outline" size={20} color="#3498db" />
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.passwordButton]}
            onPress={() => setShowPasswordModal(true)}
          >
            <Ionicons name="lock-closed-outline" size={20} color="#e67e22" />
            <Text style={[styles.actionButtonText, styles.passwordButtonText]}>Change Password</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
            <Text style={[styles.actionButtonText, styles.logoutButtonText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Full Name *"
              value={editForm.name}
              onChangeText={(text) => setEditForm({ ...editForm, name: text })}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number"
              value={editForm.phoneNumber}
              onChangeText={(text) => setEditForm({ ...editForm, phoneNumber: text })}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Age"
              value={editForm.age}
              onChangeText={(text) => setEditForm({ ...editForm, age: text })}
              keyboardType="numeric"
            />

            {user?.role === 'doctor' && (
              <TextInput
                style={styles.modalInput}
                placeholder="Specialty"
                value={editForm.specialty}
                onChangeText={(text) => setEditForm({ ...editForm, specialty: text })}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateProfile}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Current Password *"
              value={passwordForm.currentPassword}
              onChangeText={(text) => setPasswordForm({ ...passwordForm, currentPassword: text })}
              secureTextEntry
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="New Password *"
              value={passwordForm.newPassword}
              onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
              secureTextEntry
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm New Password *"
              value={passwordForm.confirmPassword}
              onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleChangePassword}
              >
                <Text style={styles.saveButtonText}>Change Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  profileCard: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  profileDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e1e8ed',
    paddingTop: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  detailLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  detailValue: {
    fontSize: 16,
    color: '#7f8c8d',
    flex: 1,
    textAlign: 'right',
  },
  actionsContainer: {
    padding: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passwordButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#e67e22',
  },
  logoutButton: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginLeft: 12,
  },
  passwordButtonText: {
    color: '#e67e22',
  },
  logoutButtonText: {
    color: '#e74c3c',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#7f8c8d',
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

}); 