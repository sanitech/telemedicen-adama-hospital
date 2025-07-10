import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuthStore();

  // If user is admin, show only admin tabs
  if (user?.role === 'admin') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#3498db',
          tabBarInactiveTintColor: '#7f8c8d',
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#e1e8ed',
          },
          headerShown: false,
        }}>

        <Tabs.Screen
          name="admin-dashboard"
          options={{
            title: 'Admin Dashboard',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />
        {/* Hide other tabs for admin */}
        <Tabs.Screen
          name="index"
          options={{
            href: null, // This hides the tab
          }}
        />
        <Tabs.Screen
          name="appointments"
          options={{
            href: null, // This hides the tab
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            href: null, // This hides the tab
          }}
        />
        <Tabs.Screen
          name="posts"
          options={{
            href: null, // This hides the tab
          }}
        />

      </Tabs>
    );
  }

  // For patients and doctors, show regular tabs
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: '#7f8c8d',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e1e8ed',
        },
        headerShown: false,
      }}>

      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="appointments"
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Consultations',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="posts"
        options={{
          title: 'Health Posts',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'newspaper' : 'newspaper-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      {/* Hide admin dashboard for non-admin users */}
      <Tabs.Screen
        name="admin-dashboard"
        options={{
          href: null, // This hides the tab
        }}
      />

    </Tabs>
  );
}
