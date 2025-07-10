import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function WelcomeScreen() {
  const { isAuthenticated, user, loadUser } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    const initializeApp = async () => {
      await loadUser();
      
      // Add a small delay to show loading state
      setTimeout(() => {
        if (isAuthenticated && user) {
          // User is logged in, redirect based on role
          if (user.role === 'admin') {
            router.replace('/(tabs)/admin-dashboard');
          } else {
            router.replace('/(tabs)');
          }
        } else {
          // User is not logged in, redirect to login
          router.replace('/auth/login');
        }
      }, 1000);
    };

    initializeApp();
  }, [isAuthenticated, user]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Adama Hospital Telemedicine</Text>
        <Text style={styles.subtitle}>Your Health, Our Priority</Text>
        <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    marginBottom: 40,
    textAlign: 'center',
    opacity: 0.9,
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    opacity: 0.8,
  },
}); 