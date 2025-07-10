import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { adminAPI, postsAPI, appointmentsAPI, paymentsAPI } from '../../services/api';

interface User {
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

interface Post {
  _id: string;
  title: string;
  content: string;
  authorId: { name: string; email: string };
  date: string;
}

interface SystemStats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalAdmins: number;
  totalAppointments: number;
  totalPayments: number;
  totalPosts: number;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    totalPatients: 0,
    totalDoctors: 0,
    totalAdmins: 0,
    totalAppointments: 0,
    totalPayments: 0,
    totalPosts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showPostsModal, setShowPostsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'analytics' | 'posts'>('users');
  
  const [doctorForm, setDoctorForm] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    age: '',
    gender: 'male',
    specialty: '',
  });
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    age: '',
    gender: 'male',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    age: '',
    gender: 'male',
    specialty: '',
    role: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadUsers(),
        loadPosts(),
        loadSystemStats(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await adminAPI.getAllUsers();
      // Filter out super admin (admin@telemedicine.com) from the user list
      const filteredUsers = response.data.filter((user: User) => 
        user.email !== 'admin@telemedicine.com'
      );
      setUsers(filteredUsers);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load users');
    }
  };

  const loadPosts = async () => {
    try {
      const response = await postsAPI.getPosts();
      setPosts(response.data.posts || []);
    } catch (error: any) {
      console.error('Error loading posts:', error);
    }
  };

  const loadSystemStats = async () => {
    try {
      // Calculate stats from existing data, excluding super admin
      const userStats = {
        totalUsers: users.length,
        totalPatients: users.filter(u => u.role === 'patient').length,
        totalDoctors: users.filter(u => u.role === 'doctor').length,
        totalAdmins: users.filter(u => u.role === 'admin' && u.email !== 'admin@telemedicine.com').length,
      };

      // Get appointment and payment stats
      const appointmentsResponse = await appointmentsAPI.getMyAppointments();
      const paymentsResponse = await paymentsAPI.getMyPayments();
      
      const stats: SystemStats = {
        ...userStats,
        totalAppointments: appointmentsResponse.data?.length || 0,
        totalPayments: paymentsResponse.data?.length || 0,
        totalPosts: posts.length,
      };
      
      setSystemStats(stats);
    } catch (error) {
      console.error('Error loading system stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddDoctor = async () => {
    if (!doctorForm.name || !doctorForm.email || !doctorForm.password || !doctorForm.specialty) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const doctorData = {
        name: doctorForm.name,
        email: doctorForm.email,
        password: doctorForm.password,
        phoneNumber: doctorForm.phoneNumber || undefined,
        age: doctorForm.age ? parseInt(doctorForm.age) : undefined,
        gender: doctorForm.gender,
        specialty: doctorForm.specialty,
      };

      await adminAPI.registerDoctor(doctorData);
      Alert.alert('Success', 'Doctor registered successfully');
      setShowAddDoctorModal(false);
      setDoctorForm({
        name: '',
        email: '',
        password: '',
        phoneNumber: '',
        age: '',
        gender: 'male',
        specialty: '',
      });
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to register doctor');
    }
  };

  const handleAddAdmin = async () => {
    if (!adminForm.name || !adminForm.email || !adminForm.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const adminData = {
        name: adminForm.name,
        email: adminForm.email,
        password: adminForm.password,
        phoneNumber: adminForm.phoneNumber || undefined,
        age: adminForm.age ? parseInt(adminForm.age) : undefined,
        gender: adminForm.gender,
      };

      await adminAPI.registerAdmin(adminData);
      Alert.alert('Success', 'Admin registered successfully');
      setShowAddAdminModal(false);
      setAdminForm({
        name: '',
        email: '',
        password: '',
        phoneNumber: '',
        age: '',
        gender: 'male',
      });
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to register admin');
    }
  };

  const handleEditUser = (userItem: User) => {
    setSelectedUser(userItem);
    setEditForm({
      name: userItem.name,
      email: userItem.email,
      phoneNumber: userItem.phoneNumber || '',
      age: userItem.age?.toString() || '',
      gender: userItem.gender || 'male',
      specialty: userItem.specialty || '',
      role: userItem.role,
    });
    setShowEditUserModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const updateData = {
        name: editForm.name,
        email: editForm.email,
        phoneNumber: editForm.phoneNumber || undefined,
        age: editForm.age ? parseInt(editForm.age) : undefined,
        gender: editForm.gender,
        specialty: editForm.specialty || undefined,
        role: editForm.role,
      };

      await adminAPI.updateUserAccount(selectedUser._id, updateData);
      Alert.alert('Success', 'User updated successfully');
      setShowEditUserModal(false);
      setSelectedUser(null);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete ${userName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminAPI.deleteUserAccount(userId);
              Alert.alert('Success', 'User deleted successfully');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handlePostAction = async (postId: string, action: 'approve' | 'reject' | 'delete') => {
    try {
      if (action === 'delete') {
        await postsAPI.deletePost(postId);
        Alert.alert('Success', 'Post deleted successfully');
      } else {
        // For approve/reject, you might need to add these endpoints to your API
        Alert.alert('Info', `${action} functionality needs to be implemented in backend`);
      }
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || `Failed to ${action} post`);
    }
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <View key={item._id} style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        {item.phoneNumber && (
          <Text style={styles.userPhone}>{item.phoneNumber}</Text>
        )}
        {item.gender && (
          <Text style={styles.userGender}>{item.gender.charAt(0).toUpperCase() + item.gender.slice(1)}</Text>
        )}
        <View style={styles.userDetails}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.roleText}>{item.role}</Text>
          </View>
          {item.specialty && (
            <Text style={styles.specialtyText}>{item.specialty}</Text>
          )}
          <Text style={styles.dateText}>Joined: {formatDate(item.createdAt)}</Text>
        </View>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditUser(item)}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteUser(item._id, item.name)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPost = ({ item }: { item: Post }) => (
    <View key={item._id} style={styles.postCard}>
      <View style={styles.postInfo}>
        <Text style={styles.postTitle}>{item.title}</Text>
        <Text style={styles.postAuthor}>By: {item.authorId.name}</Text>
        <Text style={styles.postContent} numberOfLines={3}>
          {item.content}
        </Text>
        <View style={styles.postDetails}>
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        </View>
      </View>
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handlePostAction(item._id, 'delete')}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!user || user.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Access Denied</Text>
          <Text style={styles.errorSubtext}>Only administrators can access this page.</Text>
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
          <Text style={styles.title}>Admin Dashboard</Text>
          <Text style={styles.subtitle}>Manage users, analytics, and content</Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'users' && styles.activeTab]}
            onPress={() => setActiveTab('users')}
          >
            <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
              Users ({users.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
            onPress={() => setActiveTab('analytics')}
          >
            <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
              Analytics
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
            onPress={() => setActiveTab('posts')}
          >
            <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
              Posts ({posts.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{users.filter(u => u.role === 'patient').length}</Text>
                <Text style={styles.statLabel}>Patients</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{users.filter(u => u.role === 'doctor').length}</Text>
                <Text style={styles.statLabel}>Doctors</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{users.filter(u => u.role === 'admin').length}</Text>
                <Text style={styles.statLabel}>Admins</Text>
              </View>
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddDoctorModal(true)}
              >
                <Text style={styles.addButtonText}>Add New Doctor</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addButton, styles.addAdminButton]}
                onPress={() => setShowAddAdminModal(true)}
              >
                <Text style={styles.addButtonText}>Add New Admin</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.usersContainer}>
              <Text style={styles.sectionTitle}>All Users</Text>
              {loading ? (
                <Text style={styles.loadingText}>Loading users...</Text>
              ) : users.length === 0 ? (
                <Text style={styles.emptyText}>No users found</Text>
              ) : (
                <FlatList
                  data={users}
                  renderItem={renderUser}
                  keyExtractor={(item) => item._id}
                  scrollEnabled={false}
                />
              )}
            </View>
          </>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <View style={styles.analyticsContainer}>
            <Text style={styles.sectionTitle}>System Analytics</Text>
            
            <View style={styles.analyticsGrid}>
              <View style={styles.analyticsRow}>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsNumber}>{systemStats.totalUsers}</Text>
                  <Text style={styles.analyticsLabel}>Total Users</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsNumber}>{systemStats.totalPatients}</Text>
                  <Text style={styles.analyticsLabel}>Patients</Text>
                </View>
              </View>
              
              <View style={styles.analyticsRow}>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsNumber}>{systemStats.totalDoctors}</Text>
                  <Text style={styles.analyticsLabel}>Doctors</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsNumber}>{systemStats.totalAdmins}</Text>
                  <Text style={styles.analyticsLabel}>Admins</Text>
                </View>
              </View>
              
              <View style={styles.analyticsRow}>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsNumber}>{systemStats.totalAppointments}</Text>
                  <Text style={styles.analyticsLabel}>Appointments</Text>
                </View>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsNumber}>{systemStats.totalPayments}</Text>
                  <Text style={styles.analyticsLabel}>Payments</Text>
                </View>
              </View>
              
              <View style={styles.analyticsRow}>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsNumber}>{systemStats.totalPosts}</Text>
                  <Text style={styles.analyticsLabel}>Health Posts</Text>
                </View>
              </View>
            </View>

            {/* Additional Analytics Info */}
            <View style={styles.analyticsInfoContainer}>
              <View style={styles.analyticsInfoCard}>
                <Text style={styles.analyticsInfoTitle}>System Overview</Text>
                <Text style={styles.analyticsInfoText}>
                  Total registered users: {systemStats.totalUsers}
                </Text>
                <Text style={styles.analyticsInfoText}>
                  Active consultations: {systemStats.totalAppointments}
                </Text>
                <Text style={styles.analyticsInfoText}>
                  Content published: {systemStats.totalPosts}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <View style={styles.postsContainer}>
            <Text style={styles.sectionTitle}>Health Posts Management</Text>
            {loading ? (
              <Text style={styles.loadingText}>Loading posts...</Text>
            ) : posts.length === 0 ? (
              <Text style={styles.emptyText}>No posts found</Text>
            ) : (
              <FlatList
                data={posts}
                renderItem={renderPost}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Doctor Modal */}
      <Modal
        visible={showAddDoctorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddDoctorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Doctor</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Full Name *"
              value={doctorForm.name}
              onChangeText={(text) => setDoctorForm({ ...doctorForm, name: text })}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Email *"
              value={doctorForm.email}
              onChangeText={(text) => setDoctorForm({ ...doctorForm, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number"
              value={doctorForm.phoneNumber}
              onChangeText={(text) => setDoctorForm({ ...doctorForm, phoneNumber: text })}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Password *"
              value={doctorForm.password}
              onChangeText={(text) => setDoctorForm({ ...doctorForm, password: text })}
              secureTextEntry
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Age"
              value={doctorForm.age}
              onChangeText={(text) => setDoctorForm({ ...doctorForm, age: text })}
              keyboardType="numeric"
            />
            
            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Gender</Text>
              <View style={styles.genderContainer}>
                {(['male', 'female', 'other'] as const).map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderButton,
                      doctorForm.gender === gender && styles.genderButtonActive,
                    ]}
                    onPress={() => setDoctorForm({ ...doctorForm, gender })}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        doctorForm.gender === gender && styles.genderButtonTextActive,
                      ]}
                    >
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Specialty *"
              value={doctorForm.specialty}
              onChangeText={(text) => setDoctorForm({ ...doctorForm, specialty: text })}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddDoctorModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddDoctor}
              >
                <Text style={styles.saveButtonText}>Add Doctor</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Admin Modal */}
      <Modal
        visible={showAddAdminModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddAdminModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Admin</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Full Name *"
              value={adminForm.name}
              onChangeText={(text) => setAdminForm({ ...adminForm, name: text })}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Email *"
              value={adminForm.email}
              onChangeText={(text) => setAdminForm({ ...adminForm, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number"
              value={adminForm.phoneNumber}
              onChangeText={(text) => setAdminForm({ ...adminForm, phoneNumber: text })}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Password *"
              value={adminForm.password}
              onChangeText={(text) => setAdminForm({ ...adminForm, password: text })}
              secureTextEntry
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Age"
              value={adminForm.age}
              onChangeText={(text) => setAdminForm({ ...adminForm, age: text })}
              keyboardType="numeric"
            />

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Gender</Text>
              <View style={styles.genderContainer}>
                {(['male', 'female', 'other'] as const).map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderButton,
                      adminForm.gender === gender && styles.genderButtonActive,
                    ]}
                    onPress={() => setAdminForm({ ...adminForm, gender })}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        adminForm.gender === gender && styles.genderButtonTextActive,
                      ]}
                    >
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddAdminModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddAdmin}
              >
                <Text style={styles.saveButtonText}>Add Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={showEditUserModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit User</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Full Name *"
              value={editForm.name}
              onChangeText={(text) => setEditForm({ ...editForm, name: text })}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Email *"
              value={editForm.email}
              onChangeText={(text) => setEditForm({ ...editForm, email: text })}
              keyboardType="email-address"
              autoCapitalize="none"
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

            <View style={styles.modalInputContainer}>
              <Text style={styles.modalLabel}>Gender</Text>
              <View style={styles.genderContainer}>
                {(['male', 'female', 'other'] as const).map((gender) => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderButton,
                      editForm.gender === gender && styles.genderButtonActive,
                    ]}
                    onPress={() => setEditForm({ ...editForm, gender })}
                  >
                    <Text
                      style={[
                        styles.genderButtonText,
                        editForm.gender === gender && styles.genderButtonTextActive,
                      ]}
                    >
                      {gender.charAt(0).toUpperCase() + gender.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {editForm.role === 'doctor' && (
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
                onPress={() => setShowEditUserModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateUser}
              >
                <Text style={styles.saveButtonText}>Update User</Text>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 4,
  },
  actionsContainer: {
    padding: 20,
    gap: 12,
  },
  addButton: {
    backgroundColor: '#27ae60',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  addAdminButton: {
    backgroundColor: '#e67e22',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  usersContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  userGender: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  specialtyText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
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
  modalInputContainer: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  genderButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
  },
  genderButtonActive: {
    borderColor: '#27ae60',
  },
  genderButtonText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  genderButtonTextActive: {
    fontWeight: 'bold',
    color: '#27ae60',
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
  detailValue: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 10,
  },
  tab: {
    flex: 1,
    backgroundColor: '#7f8c8d',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#27ae60',
  },
  tabText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    fontWeight: 'bold',
  },
  analyticsContainer: {
    padding: 20,
  },
  analyticsGrid: {
    padding: 20,
    gap: 15,
  },
  analyticsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 100,
    justifyContent: 'center',
  },
  analyticsNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 8,
  },
  analyticsLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    fontWeight: '500',
  },
  postsContainer: {
    padding: 20,
  },
  postCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postInfo: {
    flex: 1,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  postAuthor: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  postContent: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  postDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  postActions: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  analyticsInfoContainer: {
    padding: 20,
  },
  analyticsInfoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  analyticsInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  analyticsInfoText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
}); 