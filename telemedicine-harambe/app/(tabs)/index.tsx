import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { appointmentsAPI, postsAPI } from '../../services/api';

interface Appointment {
  _id: string;
  dateTime: string;
  status: string;
  patientId?: { name: string; email: string };
  doctorId?: { name: string; email: string; specialty: string };
  note?: string;
}

interface Post {
  _id: string;
  title: string;
  content: string;
  date: string;
  authorId: { name: string; specialty?: string };
}

export default function DashboardScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      // Load appointments
      const appointmentsResponse = await appointmentsAPI.getMyAppointments({ upcoming: true });
      setAppointments(appointmentsResponse.data.slice(0, 3));

      // Load recent posts
      const postsResponse = await postsAPI.getPosts({ limit: 3 });
      setPosts(postsResponse.data.posts);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/auth/login');
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#27ae60';
      case 'pending':
        return '#f39c12';
      case 'completed':
        return '#3498db';
      case 'cancelled':
        return '#e74c3c';
      default:
        return '#7f8c8d';
    }
  };

  const renderPatientDashboard = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/appointments')}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      {appointments.length > 0 ? (
        appointments.map((appointment) => (
          <View key={appointment._id} style={styles.appointmentCard}>
            <View style={styles.appointmentHeader}>
              <Text style={styles.appointmentDate}>
                {formatDate(appointment.dateTime)}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(appointment.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </Text>
              </View>
            </View>
            <Text style={styles.doctorName}>
              Dr. {appointment.doctorId?.name}
            </Text>
            <Text style={styles.specialty}>
              {appointment.doctorId?.specialty}
            </Text>
            {appointment.note && (
              <Text style={styles.note}>Note: {appointment.note}</Text>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No upcoming appointments</Text>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => router.push('/(tabs)/appointments')}
          >
            <Text style={styles.bookButtonText}>Book Appointment</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderDoctorDashboard = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Appointments</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/appointments')}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      {appointments.length > 0 ? (
        appointments.map((appointment) => (
          <View key={appointment._id} style={styles.appointmentCard}>
            <View style={styles.appointmentHeader}>
              <Text style={styles.appointmentDate}>
                {formatDate(appointment.dateTime)}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(appointment.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </Text>
              </View>
            </View>
            <Text style={styles.patientName}>
              {appointment.patientId?.name}
            </Text>
            <Text style={styles.patientEmail}>
              {appointment.patientId?.email}
            </Text>
            {appointment.note && (
              <Text style={styles.note}>Note: {appointment.note}</Text>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No appointments today</Text>
        </View>
      )}
    </View>
  );

  const renderAdminDashboard = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Admin Dashboard</Text>
      <View style={styles.adminStats}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{appointments.length}</Text>
          <Text style={styles.statLabel}>Active Appointments</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{posts.length}</Text>
          <Text style={styles.statLabel}>Health Posts</Text>
        </View>
      </View>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
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
          <View>
            <Text style={styles.greeting}>
              {user.role === 'doctor' ? 'Welcome back, Dr.' : 'Welcome back,'}
            </Text>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userRole}>
              {user.role === 'patient' && 'Patient'}
              {user.role === 'doctor' && `Doctor • ${user.specialty || 'General Medicine'}`}
            </Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Role-specific dashboard content */}
        {user.role === 'patient' && renderPatientDashboard()}
        {user.role === 'doctor' && renderDoctorDashboard()}

        {/* Recent Health Posts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Health Posts</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/posts')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {posts.length > 0 ? (
            posts.map((post) => (
              <TouchableOpacity
                key={post._id}
                style={styles.postCard}
                onPress={() => Alert.alert('Post Detail', `Viewing: ${post.title}`)}
              >
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postContent} numberOfLines={2}>
                  {post.content}
                </Text>
                <View style={styles.postFooter}>
                  <Text style={styles.postAuthor}>
                    By Dr. {post.authorId.name}
                  </Text>
                  <Text style={styles.postDate}>
                    {new Date(post.date).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No health posts available</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/messages')}
            >
              <Text style={styles.actionButtonText}>Messages</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/appointments')}
            >
              <Text style={styles.actionButtonText}>Appointments</Text>
            </TouchableOpacity>
                         {user.role === 'doctor' && (
               <TouchableOpacity
                 style={styles.actionButton}
                 onPress={() => router.push('/(tabs)/posts')}
               >
                 <Text style={styles.actionButtonText}>Create Post</Text>
               </TouchableOpacity>
             )}
          </View>
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  greeting: {
    fontSize: 16,
    color: '#7f8c8d',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  userRole: {
    fontSize: 14,
    color: '#3498db',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  seeAllText: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: '500',
  },
  appointmentCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  specialty: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  patientEmail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },
  note: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  bookButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  postCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 5,
  },
  postContent: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postAuthor: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '500',
  },
  postDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  adminStats: {
    flexDirection: 'row',
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
  },
  statLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3498db',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});
