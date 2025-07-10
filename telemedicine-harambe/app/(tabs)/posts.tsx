import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { postsAPI } from '../../services/api';

interface Post {
  _id: string;
  title: string;
  content: string;
  date: string;
  authorId: { name: string; specialty?: string };
}

export default function PostsScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
  });

  const loadPosts = async () => {
    try {
      const response = await postsAPI.getPosts();
      setPosts(response.data.posts);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleCreatePost = async () => {
    if (!newPost.title || !newPost.content) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      await postsAPI.createPost(newPost);
      setShowCreateModal(false);
      setNewPost({ title: '', content: '' });
      loadPosts();
      Alert.alert('Success', 'Post created successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to create post');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderPostCard = (post: Post) => (
    <TouchableOpacity
      key={post._id}
      style={styles.postCard}
      onPress={() => {
        // Navigate to post detail screen
        Alert.alert('Post Detail', `Viewing: ${post.title}`);
      }}
    >
      <Text style={styles.postTitle}>{post.title}</Text>
      <Text style={styles.postContent} numberOfLines={3}>
        {post.content}
      </Text>
      <View style={styles.postFooter}>
        <Text style={styles.postAuthor}>
          By Dr. {post.authorId.name}
          {post.authorId.specialty && ` • ${post.authorId.specialty}`}
        </Text>
        <Text style={styles.postDate}>{formatDate(post.date)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Health Posts</Text>
        {(user?.role === 'doctor' || user?.role === 'admin') && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.createButtonText}>Create Post</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {posts.length > 0 ? (
          posts.map(renderPostCard)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No health posts available</Text>
            <Text style={styles.emptyStateSubtext}>
              Check back later for health tips and information
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Post Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Health Post</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter post title"
                value={newPost.title}
                onChangeText={(text) => setNewPost({ ...newPost, title: text })}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Content *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write your health post content..."
                value={newPost.content}
                onChangeText={(text) => setNewPost({ ...newPost, content: text })}
                multiline
                numberOfLines={8}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleCreatePost}
              >
                <Text style={styles.confirmModalButtonText}>Create Post</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  createButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  postCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
    marginBottom: 12,
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
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
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
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#e1e8ed',
  },
  confirmModalButton: {
    backgroundColor: '#3498db',
  },
  cancelModalButtonText: {
    color: '#2c3e50',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 