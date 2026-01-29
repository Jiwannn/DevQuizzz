import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { HapticTab } from '../../components/haptic-tab';
import { ThemedView } from '../../components/themed-view';
import { questions } from '../../data/questions';

const { height } = Dimensions.get('window');

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [highestScore, setHighestScore] = useState(0);

  const score = parseInt(params.score as string) || 0;
  const totalQuestions = parseInt(params.totalQuestions as string) || questions.length;
  const timeElapsed = parseInt(params.timeElapsed as string) || 0;

  useEffect(() => {
    const getHighestScore = () => {
      try {
        const saved = localStorage?.getItem('quizHighestScore');
        return saved ? parseInt(saved) : 0;
      } catch {
        return 0;
      }
    };
    
    const highest = getHighestScore();
    setHighestScore(highest);
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I scored ${score}/${totalQuestions} on DevQuiz! 🚀`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const handleRestartQuiz = () => {
    router.push({
      pathname: '/(tabs)/quiz',
      params: { reset: 'true' }
    });
  };

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  const percentage = Math.round((score / totalQuestions) * 100);
  const isNewRecord = score > highestScore;
  const isPerfect = score === totalQuestions;
  const isGood = percentage >= 70;

  const getResultMessage = () => {
    if (isPerfect) return "Perfect Score! 🎯";
    if (isGood) return "Great Job! 🚀";
    return "Keep Learning! 📚";
  };

  // FIXED: Return readonly color arrays
  const getResultColors = () => {
    if (isPerfect) return ['#4CD964', '#5AC8FA'] as const;
    if (isGood) return ['#FF9500', '#FF5E3A'] as const;
    return ['#FF3B30', '#FF2D55'] as const;
  };

  const getScoreBorderColor = () => {
    if (isPerfect) return '#4CD964';
    if (isGood) return '#FF9500';
    return '#FF3B30';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Store colors in variables
  const resultColors = getResultColors();
  const borderColor = getScoreBorderColor();

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Score Circle */}
        <View style={styles.scoreContainer}>
          <View style={[styles.scoreCircle, { borderColor }]}>
            <LinearGradient
              colors={resultColors}
              style={styles.scoreGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.scoreTextContainer}>
                <Text style={styles.scoreMain}>{score}</Text>
                <Text style={styles.scoreDivider}>/</Text>
                <Text style={styles.scoreTotal}>{totalQuestions}</Text>
              </View>
            </LinearGradient>
          </View>
          
          <Text style={styles.resultMessage}>{getResultMessage()}</Text>
          <Text style={styles.percentage}>{percentage}%</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="trophy" size={18} color="#FFD700" />
            <Text style={styles.statValue}>{highestScore}</Text>
            <Text style={styles.statLabel}>Best</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="time" size={18} color="#34C759" />
            <Text style={styles.statValue}>{formatTime(timeElapsed)}</Text>
            <Text style={styles.statLabel}>Time</Text>
          </View>
          
          <View style={styles.statCard}>
            <Ionicons name="stats-chart" size={18} color="#007AFF" />
            <Text style={styles.statValue}>{percentage}%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Questions</Text>
            <Text style={styles.detailValue}>{totalQuestions}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Correct Answers</Text>
            <Text style={styles.detailValue}>{score}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time Taken</Text>
            <Text style={styles.detailValue}>{formatTime(timeElapsed)}</Text>
          </View>
          
          {isNewRecord && (
            <View style={styles.newRecordBadge}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.newRecordText}>New High Score!</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <HapticTab
            style={[styles.actionButton, styles.shareButton]}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={16} color="white" />
            <Text style={styles.buttonText}>Share</Text>
          </HapticTab>

          <View style={styles.buttonRow}>
            <HapticTab
              style={[styles.actionButton, styles.homeButton]}
              onPress={handleGoHome}
            >
              <Ionicons name="home-outline" size={16} color="#667eea" />
              <Text style={styles.homeButtonText}>Home</Text>
            </HapticTab>

            <HapticTab
              style={[styles.actionButton, styles.restartButton]}
              onPress={handleRestartQuiz}
            >
              <Ionicons name="refresh" size={16} color="white" />
              <Text style={styles.buttonText}>Try Again</Text>
            </HapticTab>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 30 : 15,
    paddingBottom: 30,
    minHeight: height - 100,
  },
  scoreContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  scoreGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreTextContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreMain: {
    fontSize: 36,
    fontWeight: '800',
    color: 'white',
    lineHeight: 40,
  },
  scoreDivider: {
    fontSize: 24,
    fontWeight: '300',
    color: 'white',
    marginHorizontal: 2,
    lineHeight: 28,
  },
  scoreTotal: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    lineHeight: 24,
  },
  resultMessage: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 24,
  },
  percentage: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginVertical: 4,
    lineHeight: 18,
  },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 12,
  },
  detailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    marginBottom: 12,
    lineHeight: 18,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 16,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
    lineHeight: 16,
  },
  newRecordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    gap: 4,
  },
  newRecordText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFD700',
    lineHeight: 14,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareButton: {
    backgroundColor: '#5856D6',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  homeButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: '#667eea',
  },
  restartButton: {
    flex: 2,
    backgroundColor: '#667eea',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
  },
  homeButtonText: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 16,
  },
});