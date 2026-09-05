import { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';

type Topic = {
  id: number;
  name: string;
  created_at: string;
};

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [newTopicName, setNewTopicName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTopics = async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('topics')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Failed to load topics', error.message);
    } else {
      setTopics(data ?? []);
    }
    setLoading(false);
  };

  useFocusEffect(
      useCallback(() => {
        fetchTopics();
      }, [])
  );

  const createTopic = async () => {
    const trimmed = newTopicName.trim();
    if (!trimmed) return;

    const { error } = await supabase.from('topics').insert({ name: trimmed });

    if (error) {
      Alert.alert('Failed to create topic', error.message);
      return;
    }

    setNewTopicName('');
    fetchTopics();
  };

  return (
      <View className="flex-1 bg-background px-5" style={{ paddingTop: insets.top + 20 }}>
        <Text className="text-textPrimary text-3xl font-bold mb-5">Topics</Text>

        <View className="flex-row gap-2.5 mb-5">
          <TextInput
              className="flex-1 bg-surface text-textPrimary rounded-xl px-4 py-3 text-base"
              placeholder="New topic name"
              placeholderTextColor="#888"
              value={newTopicName}
              onChangeText={setNewTopicName}
          />
          <TouchableOpacity className="bg-accent rounded-xl px-5 justify-center" onPress={createTopic}>
            <Text className="text-white font-semibold">Add</Text>
          </TouchableOpacity>
        </View>

        <FlatList
            data={topics}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
                <View className="bg-surface rounded-xl p-4">
                  <Text className="text-textPrimary text-base">{item.name}</Text>
                </View>
            )}
            ListEmptyComponent={
              !loading ? (
                  <Text className="text-textMuted text-base text-center mt-10">
                    No topics yet. Add one above.
                  </Text>
              ) : null
            }
            contentContainerStyle={{ gap: 10 }}
        />
      </View>
  );
}