import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useRouter } from 'expo-router';

type SettingsRowProps = {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
};

function SettingsRow({ icon, label, value, onPress, rightElement }: SettingsRowProps) {
    return (
        <TouchableOpacity
            className="flex-row items-center bg-surface rounded-2xl px-4 py-4"
            onPress={onPress}
            disabled={!onPress}
        >
            <Ionicons name={icon} size={20} color="#a3a3a3" />
            <Text className="text-textPrimary text-base ml-3 flex-1">{label}</Text>
            {value && <Text className="text-textMuted text-base mr-2">{value}</Text>}
            {rightElement ?? (onPress && <Ionicons name="chevron-forward" size={18} color="#666" />)}
        </TouchableOpacity>
    );
}

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const [lockEnabled, setLockEnabled] = useState(true);

    return (
        <ScrollView
            className="flex-1 bg-background"
            contentContainerStyle={{ paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: 40 }}
        >
            {/* Header with Back Button */}
            <View className="flex-row items-center mb-6">
                <TouchableOpacity
                    className="w-11 h-11 rounded-full bg-surface items-center justify-center mr-4 shadow-sm"
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={20} color="#a3a3a3" />
                </TouchableOpacity>
                <Text className="text-textPrimary text-3xl font-bold">Settings</Text>
            </View>

            <Text className="text-textMuted text-sm font-semibold mb-2 ml-1">GENERAL</Text>
            <View className="gap-2 mb-6">
                <SettingsRow icon="language" label="Transcription Language" value="English" onPress={() => {}} />
                <SettingsRow icon="color-palette" label="Theme" value="Dark" onPress={() => {}} />
                <SettingsRow
                    icon="lock-closed"
                    label="Require Unlock"
                    rightElement={
                        <Switch value={lockEnabled} onValueChange={setLockEnabled} />
                    }
                />
            </View>

            <Text className="text-textMuted text-sm font-semibold mb-2 ml-1">CONNECTION</Text>
            <View className="gap-2 mb-6">
                <SettingsRow icon="server" label="Backend URL" value="192.168.1.5:5050" onPress={() => {}} />
            </View>

            <Text className="text-textMuted text-sm font-semibold mb-2 ml-1">DATA</Text>
            <View className="gap-2 mb-6">
                <SettingsRow icon="trash" label="Clear All Recordings" onPress={() => {}} />
            </View>

            <Text className="text-textMuted text-sm font-semibold mb-2 ml-1">ABOUT</Text>
            <View className="gap-2">
                <SettingsRow icon="document-text" label="Changelog" onPress={() => {}} />
                <SettingsRow icon="information-circle" label="Version" value="1.0.0" />
            </View>
        </ScrollView>
    );
}