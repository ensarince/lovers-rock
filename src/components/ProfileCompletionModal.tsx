import { Text, View } from '@/components/Themed';
import { useAuth } from '@/src/context/AuthContext';
import { createDefaultGrade, formatGradeDisplay, getExampleGrades } from '@/src/services/gradeService';
import { theme as themeDark } from '@/src/themeDark';
import { theme as themeLight } from '@/src/themeLight';
import { Climber, ClimbingGrade, ClimbingStyle, Gender, GeneralLevel, GradeSystem } from '@/src/types/climber';
import { getPocketBaseUrl } from '@/src/utils/helperFunctions';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
} from 'react-native';

const GENERAL_LEVELS: GeneralLevel[] = [
    'beginner',
    'intermediate',
    'advanced',
    'expert',
    'elite',
];

const GRADE_SYSTEMS: GradeSystem[] = [
    'french',
    'uiaa',
];

const CLIMBING_STYLES: ClimbingStyle[] = [
    'bouldering',
    'sport',
    'trad',
    'gym',
    'outdoor',
];

const GENDER_OPTIONS: Gender[] = [
    'male',
    'female',
    'non_binary',
    'prefer_not_to_say',
];

interface ProfileCompletionModalProps {
    visible: boolean;
    user: Climber | null;
    onComplete: (updatedUser: Climber) => void;
    darkMode: boolean;
}

export const ProfileCompletionModal: React.FC<ProfileCompletionModalProps> = ({
    visible,
    user,
    onComplete,
    darkMode,
}) => {
    const { token } = useAuth();
    const theme = darkMode ? themeDark : themeLight;
    const styles = createStyles(theme);

    const [name, setName] = useState(user?.name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [age, setAge] = useState(user?.age ? String(user.age) : '');
    const [gender, setGender] = useState<Gender | undefined>(user?.gender);
    const [grade, setGrade] = useState<ClimbingGrade>(
        user?.grade ? user.grade : createDefaultGrade()
    );
    const [climbingStyles, setClimbingStyles] = useState<ClimbingStyle[]>(
        user?.climbing_styles || []
    );
    const [homeGym, setHomeGym] = useState(user?.home_gym || '');
    const [images, setImages] = useState<string[]>(user?.images || []);
    const [newPhotos, setNewPhotos] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [showGradeSystemModal, setShowGradeSystemModal] = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setBio(user.bio || '');
            setAge(user.age ? String(user.age) : '');
            setGender(user.gender);
            setGrade(user.grade ? user.grade : createDefaultGrade());
            setClimbingStyles(user.climbing_styles || []);
            setHomeGym(user.home_gym || '');
            setImages(user.images || []);
            setNewPhotos([]);
        }
    }, [user, visible]);

    const handleImagePicker = async (index: number) => {
        const currentImageCount = newPhotos.length + images.length;
        if (currentImageCount >= 3 && !newPhotos[index]) {
            Alert.alert('Limit Reached', 'You can upload a maximum of 3 images');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            const newPhotoCopy = [...newPhotos];
            newPhotoCopy[index] = result.assets[0].uri;
            setNewPhotos(newPhotoCopy);
        }
    };

    const removeImage = (index: number) => {
        if (index < images.length) {
            // Remove existing image from server
            setImages((prev) => prev.filter((_, i) => i !== index));
        } else {
            // Remove new photo
            const imageIndex = index - images.length;
            const newPhotoCopy = [...newPhotos];
            newPhotoCopy.splice(imageIndex, 1);
            setNewPhotos(newPhotoCopy);
        }
    };

    const toggleStyle = (style: ClimbingStyle) => {
        setClimbingStyles((prev) =>
            prev.includes(style) ? prev.filter((s) => s !== style) : [...prev, style]
        );
    };

    const handleGradeChange = (field: keyof ClimbingGrade, value: string) => {
        setGrade((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSave = async () => {
        // Validation
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter your name');
            return;
        }
        if (!age.trim() || isNaN(Number(age))) {
            Alert.alert('Required', 'Please enter a valid age');
            return;
        }
        if (Number(age) < 18) {
            Alert.alert('Age Requirement', 'You must be at least 18 years old to use the app.');
            return;
        }
        if (!gender) {
            Alert.alert('Required', 'Please select your gender');
            return;
        }
        if (!homeGym.trim()) {
            Alert.alert('Required', 'Please enter your home gym');
            return;
        }
        if (!bio.trim()) {
            Alert.alert('Required', 'Please enter a bio');
            return;
        }
        if (climbingStyles.length === 0) {
            Alert.alert('Required', 'Please select at least one climbing style');
            return;
        }

        const totalImages = images.length + newPhotos.filter(p => p).length;
        if (totalImages < 3) {
            Alert.alert('Required', `Please upload ${3 - totalImages} more image(s). You need 3 images total.`);
            return;
        }

        if (!user?.id) {
            Alert.alert('Error', 'User ID not available');
            return;
        }

        setSaving(true);
        try {
            if (!token) {
                Alert.alert('Error', 'Authentication token not available');
                setSaving(false);
                return;
            }

            const POCKETBASE_URL = getPocketBaseUrl();
            const formData = new FormData();

            // Add form fields
            formData.append('name', name.trim());
            formData.append('age', String(Number(age)));
            formData.append('gender', gender);
            formData.append('bio', bio.trim());
            formData.append('home_gym', homeGym.trim());
            formData.append('climbing_styles', JSON.stringify(climbingStyles));
            formData.append('grade', JSON.stringify(grade));
            formData.append('profile_completed', 'true');

            // Add new image files - only upload files, not JSON
            newPhotos.forEach((photoUri, index) => {
                if (photoUri) {
                    const extension = photoUri.split('.').pop()?.toLowerCase() || 'jpg';
                    let mimeType = 'image/jpeg';
                    if (extension === 'png') mimeType = 'image/png';
                    else if (extension === 'jpg' || extension === 'jpeg') mimeType = 'image/jpeg';
                    else if (extension === 'webp') mimeType = 'image/webp';

                    const file = {
                        uri: photoUri,
                        name: `image_${index}.${extension}`,
                        type: mimeType,
                    } as any;
                    formData.append('images', file);
                }
            });

            // Do NOT set avatar to new image filenames yet - they don't exist
            // We'll set it after the upload completes and we fetch the actual filenames

            const response = await fetch(
                `${POCKETBASE_URL}/api/collections/users/records/${user.id}`,
                {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            if (!response.ok) {
                let errorData = {};
                try {
                    errorData = await response.json();
                } catch (e) {
                    console.error('Failed to parse error response as JSON');
                }
                console.error('PocketBase error response:', errorData);
                const errorMsg = (errorData as any)?.message || (errorData as any)?.details?.message || `Update failed with status ${response.status}`;
                throw new Error(errorMsg);
            }

            const updatedRecord = await response.json();

            const updatedImages = Array.isArray(updatedRecord.images)
                ? updatedRecord.images
                : [];

            // Set avatar to first image if available
            let avatarToUse = updatedRecord.avatar || '';
            if (updatedImages.length > 0) {
                avatarToUse = updatedImages[0];
            }

            // If we uploaded new images, set avatar to the first image with its actual filename
            if (newPhotos.length > 0 && updatedImages.length > 0) {
                try {
                    const avatarResponse = await fetch(
                        `${POCKETBASE_URL}/api/collections/users/records/${user.id}`,
                        {
                            method: 'PATCH',
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                avatar: updatedImages[0],
                            }),
                        }
                    );

                    if (avatarResponse.ok) {
                        const finalRecord = await avatarResponse.json();
                        avatarToUse = finalRecord.avatar || updatedImages[0];
                    }
                } catch (avatarErr) {
                    console.error('Error setting avatar:', avatarErr);
                    // Continue anyway, images are already uploaded
                    avatarToUse = updatedImages[0];
                }
            }

            const updatedClimber: Climber = {
                ...user,
                name: updatedRecord.name,
                age: updatedRecord.age,
                gender: updatedRecord.gender,
                bio: updatedRecord.bio,
                home_gym: updatedRecord.home_gym,
                climbing_styles: updatedRecord.climbing_styles,
                grade:
                    typeof updatedRecord.grade === 'string'
                        ? JSON.parse(updatedRecord.grade)
                        : updatedRecord.grade,
                images: updatedImages,
                avatar: avatarToUse,
                profile_completed: true,
            };

            onComplete(updatedClimber);
        } catch (error: any) {
            console.error('Profile completion error:', error);
            Alert.alert('Error', error.message || 'Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const totalImages = images.length + newPhotos.filter(p => p).length;
    const isFormValid =
        name.trim() &&
        age.trim() &&
        !isNaN(Number(age)) &&
        gender &&
        homeGym.trim() &&
        bio.trim() &&
        climbingStyles.length > 0 &&
        totalImages >= 3;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={false}
            hardwareAccelerated
        >
            <View style={[styles.container, { paddingTop: 40 }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>Complete Your Profile</Text>
                    <Text style={styles.subtitle}>
                        Let's get to know you better!
                    </Text>
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.contentPadding}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Images Section - 3 images required */}
                    <View style={[styles.imagesSection, totalImages < 3 && styles.imagesSectionIncomplete]}>
                        <View style={styles.imagesHeaderRow}>
                            <View style={styles.imagesHeaderContent}>
                                <Text style={styles.imagesHeaderLabel}>
                                    <Text style={styles.requirementAsterisk}>*</Text> Upload Photos
                                </Text>
                                <Text style={styles.imagesHeaderSubtitle}>Required for your profile</Text>
                            </View>
                            <View style={styles.progressBadge}>
                                <Text style={styles.progressText}>{totalImages}</Text>
                                <Text style={styles.progressTotal}>/3</Text>
                            </View>
                        </View>

                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    { width: `${(totalImages / 3) * 100}%` },
                                    totalImages === 3 && styles.progressBarFillComplete,
                                ]}
                            />
                        </View>

                        <View style={styles.imagesGrid}>
                            {[0, 1, 2].map((index) => {
                                const hasExistingImage = index < images.length;
                                const hasNewPhoto =
                                    index - images.length >= 0 &&
                                    newPhotos[index - images.length];
                                const imageUri = hasExistingImage
                                    ? images[index]
                                    : newPhotos[index - images.length];
                                const isNewPhoto = hasNewPhoto && !hasExistingImage;

                                return (
                                    <View key={index} style={styles.imageSlot}>
                                        <Pressable
                                            style={styles.imageButton}
                                            onPress={() => handleImagePicker(index)}
                                        >
                                            {imageUri ? (
                                                <Image
                                                    source={{
                                                        uri: isNewPhoto
                                                            ? imageUri
                                                            : `${getPocketBaseUrl()}/api/files/users/${user?.id}/${imageUri}?thumb=200x200`,
                                                    }}
                                                    style={styles.imageThumb}
                                                />
                                            ) : (
                                                <View style={styles.imagePlaceholder}>
                                                    <Ionicons
                                                        name="camera-outline"
                                                        size={36}
                                                        color={theme.colors.textSecondary}
                                                    />
                                                </View>
                                            )}
                                        </Pressable>
                                        {imageUri && (
                                            <Pressable
                                                style={styles.removeImageButton}
                                                onPress={() => removeImage(index)}
                                            >
                                                <Ionicons name="close" size={20} color="#fff" />
                                            </Pressable>
                                        )}
                                        <Text style={styles.imageIndex}>{index + 1}/3</Text>
                                    </View>
                                );
                            })}
                        </View>

                        <View style={styles.imagesFooter}>
                            <Ionicons
                                name={totalImages === 3 ? 'checkmark-circle' : 'information-circle'}
                                size={16}
                                color={totalImages === 3 ? theme.colors.success : theme.colors.error}
                                style={{ marginRight: 8 }}
                            />
                            <Text style={[
                                styles.imagesHint,
                                totalImages === 3 && styles.imagesHintComplete,
                                totalImages < 3 && styles.imagesHintIncomplete,
                            ]}>
                                {totalImages < 3
                                    ? `Add ${3 - totalImages} more image${3 - totalImages > 1 ? 's' : ''}`
                                    : 'Perfect! All 3 images uploaded'}
                            </Text>
                        </View>
                    </View>

                    {/* Name Input */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Your name"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={name}
                            onChangeText={setName}
                        />
                    </View>

                    {/* Age Input */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Age *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Your age"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={age}
                            onChangeText={setAge}
                            keyboardType="number-pad"
                        />
                    </View>

                    {/* Gender Selection */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Gender *</Text>
                        <View style={styles.genderGrid}>
                            {GENDER_OPTIONS.map((option) => (
                                <Pressable
                                    key={option}
                                    style={[
                                        styles.genderButton,
                                        gender === option && styles.genderButtonActive,
                                    ]}
                                    onPress={() => setGender(option)}
                                >
                                    <Text
                                        style={[
                                            styles.genderButtonText,
                                            gender === option && styles.genderButtonTextActive,
                                        ]}
                                    >
                                        {option === 'non_binary' ? 'Non-binary' : option === 'prefer_not_to_say' ? 'Prefer not to say' : option.charAt(0).toUpperCase() + option.slice(1)}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Climbing Styles */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Climbing Styles *</Text>
                        <View style={styles.styleGrid}>
                            {CLIMBING_STYLES.map((style) => (
                                <Pressable
                                    key={style}
                                    style={[
                                        styles.styleButton,
                                        climbingStyles.includes(style) && styles.styleButtonActive,
                                    ]}
                                    onPress={() => toggleStyle(style)}
                                >
                                    <Text
                                        style={[
                                            styles.styleButtonText,
                                            climbingStyles.includes(style) &&
                                            styles.styleButtonTextActive,
                                        ]}
                                    >
                                        {style.charAt(0).toUpperCase() + style.slice(1)}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Climbing Grade */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Climbing Grade</Text>
                        <Pressable
                            style={styles.gradeSelector}
                            onPress={() => setShowGradeSystemModal(true)}
                        >
                            <Text style={styles.gradeSelectorText}>
                                {formatGradeDisplay(grade)}
                            </Text>
                            <Ionicons
                                name="chevron-down"
                                size={20}
                                color={theme.colors.accent}
                            />
                        </Pressable>

                        {/* Grade System Modal */}
                        <Modal
                            visible={showGradeSystemModal}
                            transparent
                            animationType="fade"
                            onRequestClose={() => setShowGradeSystemModal(false)}
                        >
                            <Pressable
                                style={styles.modalOverlay}
                                onPress={() => setShowGradeSystemModal(false)}
                            >
                                <Pressable
                                    style={styles.gradeModal}
                                    onPress={(e) => e.stopPropagation()}
                                >
                                    <ScrollView showsVerticalScrollIndicator={false}>
                                        <Text style={styles.modalTitle}>Select Grade System</Text>

                                        {GRADE_SYSTEMS.map((sys) => (
                                            <Pressable
                                                key={sys}
                                                style={[
                                                    styles.systemOption,
                                                    grade.system === sys && styles.systemOptionSelected,
                                                ]}
                                                onPress={() => {
                                                    setGrade((prev) => ({ ...prev, system: sys }));
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        styles.systemOptionText,
                                                        grade.system === sys && styles.systemOptionTextActive,
                                                    ]}
                                                >
                                                    {sys.toUpperCase()}
                                                </Text>
                                                {grade.system === sys && (
                                                    <Ionicons name="checkmark" size={20} color={theme.colors.accent} />
                                                )}
                                            </Pressable>
                                        ))}

                                        {grade.system && (
                                            <>
                                                <Text style={styles.modalTitle}>Select Level</Text>
                                                {GENERAL_LEVELS.map((level) => (
                                                    <Pressable
                                                        key={level}
                                                        style={[
                                                            styles.gradeOption,
                                                            grade.general_level === level && styles.gradeOptionSelected,
                                                        ]}
                                                        onPress={() => {
                                                            setGrade((prev) => ({ ...prev, general_level: level }));
                                                        }}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.gradeOptionText,
                                                                grade.general_level === level &&
                                                                styles.gradeOptionTextActive,
                                                            ]}
                                                        >
                                                            {level.charAt(0).toUpperCase() + level.slice(1)}
                                                        </Text>
                                                        {grade.general_level === level && (
                                                            <Ionicons name="checkmark" size={20} color={theme.colors.accent} />
                                                        )}
                                                    </Pressable>
                                                ))}

                                                <Text style={styles.modalTitle}>Select Grade Value</Text>
                                                {getExampleGrades(grade.system as GradeSystem).map((exGrade, index) => (
                                                    <Pressable
                                                        key={`${grade.system}-${index}-${exGrade}`}
                                                        style={[
                                                            styles.gradeOption,
                                                            grade.value === exGrade && styles.gradeOptionSelected,
                                                        ]}
                                                        onPress={() => {
                                                            setGrade((prev) => ({ ...prev, value: exGrade }));
                                                        }}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.gradeOptionText,
                                                                grade.value === exGrade &&
                                                                styles.gradeOptionTextActive,
                                                            ]}
                                                        >
                                                            {exGrade}
                                                        </Text>
                                                        {grade.value === exGrade && (
                                                            <Ionicons name="checkmark" size={20} color={theme.colors.accent} />
                                                        )}
                                                    </Pressable>
                                                ))}
                                            </>
                                        )}

                                        <Pressable
                                            style={styles.closeButton}
                                            onPress={() => setShowGradeSystemModal(false)}
                                        >
                                            <Text style={styles.closeButtonText}>Done</Text>
                                        </Pressable>
                                    </ScrollView>
                                </Pressable>
                            </Pressable>
                        </Modal>
                    </View>

                    {/* Home Gym Input */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Home Gym *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Your home gym"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={homeGym}
                            onChangeText={setHomeGym}
                        />
                    </View>

                    {/* Bio Input */}
                    <View style={styles.fieldGroup}>
                        <Text style={styles.label}>Bio *</Text>
                        <TextInput
                            style={[styles.input, styles.bioInput]}
                            placeholder="Tell us about yourself"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>

                    <View style={styles.spacer} />
                </ScrollView>

                {/* Save Button */}
                <View style={styles.buttonContainer}>
                    <Pressable
                        style={[
                            styles.saveButton,
                            (!isFormValid || saving) && styles.saveButtonDisabled,
                        ]}
                        onPress={handleSave}
                        disabled={!isFormValid || saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={theme.colors.background} />
                        ) : (
                            <Text style={styles.saveButtonText}>Complete Profile</Text>
                        )}
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

const createStyles = (theme: any) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.colors.background,
        },
        header: {
            paddingHorizontal: 20,
            marginBottom: 20,
            backgroundColor: "transparent"
        },
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginBottom: 8,
        },
        subtitle: {
            fontSize: 14,
            color: theme.colors.textSecondary,
        },
        content: {
            flex: 1,
        },
        contentPadding: {
            paddingHorizontal: 20,
            paddingBottom: 20,
        },
        fieldGroup: {
            marginBottom: 20,
            backgroundColor: "transparent"
        },
        label: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.colors.text,
            marginBottom: 8,
            backgroundColor: theme.colors.background
        },
        input: {
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 14,
            color: theme.colors.text,
            backgroundColor: theme.colors.surface,
        },
        bioInput: {
            minHeight: 100,
            paddingTop: 10,
        },
        avatarSection: {
            alignItems: 'center',
            marginBottom: 24,
            backgroundColor: "transparent"
        },
        avatarButton: {
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: theme.colors.surface,
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: theme.colors.border,
            marginBottom: 8,
            overflow: 'hidden',
        },
        avatarImage: {
            width: '100%',
            height: '100%',
        },
        avatarText: {
            fontSize: 14,
            color: theme.colors.textSecondary,
        },
        imagesSection: {
            marginBottom: 24,
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: theme.colors.border,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
        },
        imagesSectionIncomplete: {
            borderColor: theme.colors.error,
            borderWidth: 2,
            shadowColor: theme.colors.error,
            shadowOpacity: 0.15,
        },
        imagesHeaderRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: "transparent",
            marginBottom: 12,
        },
        imagesHeaderContent: {
            flex: 1,
            backgroundColor: "transparent",
        },
        imagesHeaderLabel: {
            fontSize: 16,
            fontWeight: '700',
            color: theme.colors.text,
            marginBottom: 4,
        },
        imagesHeaderSubtitle: {
            fontSize: 12,
            color: theme.colors.textSecondary,
            fontWeight: '500',
        },
        requirementAsterisk: {
            color: theme.colors.error,
            fontWeight: '800',
        },
        progressBadge: {
            flexDirection: 'row',
            alignItems: 'baseline',
            backgroundColor: theme.colors.accent + '15',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 8,
        },
        progressText: {
            fontSize: 18,
            fontWeight: '700',
            color: theme.colors.accent,
        },
        progressTotal: {
            fontSize: 14,
            fontWeight: '600',
            color: theme.colors.textSecondary,
            marginLeft: 2,
        },
        progressBar: {
            height: 6,
            backgroundColor: theme.colors.border,
            borderRadius: 3,
            overflow: 'hidden',
            marginBottom: 12,
        },
        progressBarFill: {
            height: '100%',
            backgroundColor: theme.colors.accent,
            borderRadius: 3,
        },
        progressBarFillComplete: {
            backgroundColor: theme.colors.success,
        },
        imagesGrid: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
            marginVertical: 8,
            backgroundColor: "transparent"
        },
        imageSlot: {
            flex: 1,
            alignItems: 'center',
            backgroundColor: "transparent"
        },
        imageButton: {
            width: '100%',
            aspectRatio: 1,
            borderRadius: 12,
            backgroundColor: theme.colors.surface,
            borderWidth: 2,
            borderColor: theme.colors.border,
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
        },
        imageThumb: {
            width: '100%',
            height: '100%',
        },
        imagePlaceholder: {
            width: '100%',
            height: '100%',
            backgroundColor: "transparent",
            justifyContent: 'center',

            alignItems: 'center',
        },
        removeImageButton: {
            position: 'absolute',
            top: -8,
            right: -8,
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: '#ef4444',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: theme.colors.background,
        },
        imageIndex: {
            fontSize: 11,
            color: theme.colors.textSecondary,
            marginTop: 6,
            fontWeight: '500',
        },
        imagesHint: {
            fontSize: 13,
            color: theme.colors.textSecondary,
            fontWeight: '500',
        },
        imagesHintComplete: {
            color: theme.colors.success,
            fontWeight: '600',
        },
        imagesHintIncomplete: {
            color: theme.colors.error,
            fontWeight: '600',
        },
        imagesFooter: {
            flexDirection: 'row',
            backgroundColor: "transparent",
            alignItems: 'center',
            marginTop: 12,
        },
        styleGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            backgroundColor: "transparent"
        },
        styleButton: {
            flex: 1,
            minWidth: '45%',
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 8,
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
        },
        styleButtonActive: {
            backgroundColor: theme.colors.accent,
            borderColor: theme.colors.accent,
        },
        styleButtonText: {
            fontSize: 13,
            color: theme.colors.text,
        },
        styleButtonTextActive: {
            color: '#fff',
            fontWeight: '600',
        },
        gradeSelector: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: theme.colors.surface,
        },
        gradeSelectorText: {
            fontSize: 14,
            color: theme.colors.text,
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'flex-end',
        },
        gradeModal: {
            backgroundColor: theme.colors.background,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 40,
            maxHeight: '80%',
        },
        modalTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: theme.colors.text,
            marginTop: 16,
            marginBottom: 12,
        },
        systemOption: {
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        systemOptionSelected: {
            backgroundColor: theme.colors.surface,
        },
        systemOptionText: {
            fontSize: 14,
            color: theme.colors.text,
        },
        systemOptionTextActive: {
            color: theme.colors.accent,
            fontWeight: 'bold',
        },
        gradeOption: {
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.border,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        gradeOptionSelected: {
            backgroundColor: theme.colors.surface,
        },
        gradeOptionText: {
            fontSize: 14,
            color: theme.colors.text,
        },
        gradeOptionTextActive: {
            color: theme.colors.accent,
            fontWeight: 'bold',
        },
        closeButton: {
            marginTop: 16,
            paddingVertical: 12,
            backgroundColor: theme.colors.accent,
            borderRadius: 8,
            alignItems: 'center',
        },
        closeButtonText: {
            color: '#fff',
            fontSize: 16,
            fontWeight: 'bold',
        },
        spacer: {
            height: 20,
            backgroundColor: "transparent"
        },
        buttonContainer: {
            paddingHorizontal: 20,
            paddingBottom: 20,
            backgroundColor: "transparent"
        },
        saveButton: {
            backgroundColor: theme.colors.accent,
            paddingVertical: 12,
            borderRadius: 8,
            alignItems: 'center',
        },
        saveButtonDisabled: {
            opacity: 0.5,
        },
        saveButtonText: {
            color: '#fff',
            fontSize: 16,
            fontWeight: 'bold',
        },
        genderGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            backgroundColor: "transparent"
        },
        genderButton: {
            flex: 1,
            minWidth: '45%',
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 8,
            backgroundColor: theme.colors.surface,
            alignItems: 'center',
        },
        genderButtonActive: {
            backgroundColor: theme.colors.accent,
            borderColor: theme.colors.accent,
        },
        genderButtonText: {
            fontSize: 13,
            color: theme.colors.text,
        },
        genderButtonTextActive: {
            color: '#fff',
            fontWeight: '600',
        },
    });
