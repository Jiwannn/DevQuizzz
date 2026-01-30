import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { HapticTab } from '../../components/haptic-tab';
import { ThemedView } from '../../components/themed-view';
import { questions } from '../../data/questions';

const { width, height } = Dimensions.get('window');

export default function QuizScreen() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<Record<number, string[]>>({});
  const [isAnswerSelected, setIsAnswerSelected] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const currentQ = questions[currentQuestion];
  const progress = (currentQuestion + 1) / questions.length;
  const isLastQuestion = currentQuestion === questions.length - 1;


  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    Animated.spring(progressAnim, {
      toValue: progress,
      tension: 60,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [currentQuestion]);

  const handleAnswerSelect = (choiceKey: string) => {
    if (currentQ.type === 'checkbox') {
      const newSelection = { ...selectedCheckboxes };
      if (!newSelection[currentQuestion]) {
        newSelection[currentQuestion] = [];
      }
      
      if (newSelection[currentQuestion].includes(choiceKey)) {
        newSelection[currentQuestion] = newSelection[currentQuestion].filter(
          (key) => key !== choiceKey
        );
      } else {
        newSelection[currentQuestion].push(choiceKey);
      }
      
      setSelectedCheckboxes(newSelection);
      setIsAnswerSelected(newSelection[currentQuestion].length > 0);
    } else {
      setSelectedAnswers({
        ...selectedAnswers,
        [currentQuestion]: choiceKey,
      });
      setIsAnswerSelected(true);
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setIsAnswerSelected(selectedAnswers[currentQuestion + 1] !== undefined);
    } else {
      // STOP TIMER when finishing quiz
      setTimerActive(false);
      calculateScore();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setIsAnswerSelected(selectedAnswers[currentQuestion - 1] !== undefined);
    }
  };

  const calculateScore = () => {
    let newScore = 0;
    
    questions.forEach((question, index) => {
      if (question.type === 'checkbox') {
        const selected = selectedCheckboxes[index] || [];
        const correctAnswers = question.answer;
        
        if (
          selected.length === correctAnswers.length &&
          selected.every((ans) => correctAnswers.includes(ans))
        ) {
          newScore++;
        }
      } else {
        if (selectedAnswers[index] === question.answer) {
          newScore++;
        }
      }
    });
    
    const highestScore = getHighestScore();
    if (newScore > highestScore) {
      saveHighestScore(newScore);
    }
    
    // Navigate to results with final time
    router.push({
      pathname: '/(tabs)/results',
      params: { 
        score: newScore.toString(),
        totalQuestions: questions.length.toString(),
        timeElapsed: timeElapsed.toString()
      }
    });
  };

  const getHighestScore = () => {
    try {
      const saved = localStorage?.getItem('quizHighestScore');
      return saved ? parseInt(saved) : 0;
    } catch {
      return 0;
    }
  };

  const saveHighestScore = (score: number) => {
    try {
      localStorage?.setItem('quizHighestScore', score.toString());
    } catch (error) {
      console.log('Error saving score:', error);
    }
  };

  const getChoiceStyle = (choiceKey: string) => {
    const isSelected = currentQ.type === 'checkbox' 
      ? selectedCheckboxes[currentQuestion]?.includes(choiceKey)
      : selectedAnswers[currentQuestion] === choiceKey;
    
    return [
      styles.choiceButton,
      isSelected && styles.selectedChoice,
    ];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const getTypeDisplay = () => {
    switch (currentQ.type) {
      case 'multiple': return 'Multiple Choice';
      case 'truefalse': return 'True/False';
      case 'checkbox': return 'Multiple Select';
      default: return currentQ.type;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#f8f9fa', '#e9ecef']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.typeBox}>
              <Text style={styles.typeText}>{getTypeDisplay()}</Text>
            </View>
            
            <View style={styles.timerBox}>
              <Text style={styles.timerText}>{formatTime(timeElapsed)}</Text>
            </View>
            
            <View style={styles.counterBox}>
              <Text style={styles.counterText}>{currentQuestion + 1}/{questions.length}</Text>
            </View>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressPercent}>
            {Math.round(progress * 100)}%
          </Text>
        </View>

        {/* Question */}
        <View style={styles.questionContainer}>
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>
              {currentQ.question}
            </Text>
          </View>
        </View>

        {/* Choices */}
        <View style={styles.choicesContainer}>
          {Object.entries(currentQ.choices).map(([key, value]) => (
            <HapticTab
              key={key}
              style={getChoiceStyle(key)}
              onPress={() => handleAnswerSelect(key)}
            >
              <View style={styles.choiceContent}>
                <View style={styles.choiceLetterBox}>
                  <Text style={styles.choiceLetter}>{key}</Text>
                </View>
                <Text style={styles.choiceText} numberOfLines={2}>
                  {value}
                </Text>
              </View>
            </HapticTab>
          ))}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navContainer}>
          <View style={styles.navButtons}>
            <HapticTab
              style={[
                styles.navButton,
                styles.prevButton,
                currentQuestion === 0 && styles.disabledButton,
              ]}
              onPress={handlePrevious}
              disabled={currentQuestion === 0}
            >
              <Text style={styles.navButtonText}>Previous</Text>
            </HapticTab>

            <HapticTab
              style={[
                styles.navButton,
                styles.nextButton,
                !isAnswerSelected && styles.disabledButton,
              ]}
              onPress={handleNext}
              disabled={!isAnswerSelected}
            >
              <Text style={styles.navButtonText}>
                {isLastQuestion ? 'Finish Quiz' : 'Next Question'}
              </Text>
            </HapticTab>
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: StatusBar.currentHeight || 50,
    paddingBottom: 20,
  },
  header: {
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeBox: {
    backgroundColor: 'rgba(108, 117, 125, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 110,
    alignItems: 'center',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    lineHeight: 14,
  },
  timerBox: {
    backgroundColor: 'rgba(33, 37, 41, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    lineHeight: 16,
  },
  counterBox: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 55,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#667eea',
    lineHeight: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#667eea',
    borderRadius: 3,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    minWidth: 35,
    lineHeight: 14,
  },
  questionContainer: {
    marginBottom: 24,
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 100,
    justifyContent: 'center',
  },
  questionText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
  choicesContainer: {
    flex: 1,
    marginBottom: 20,
  },
  choiceButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  selectedChoice: {
    backgroundColor: 'rgba(102, 126, 234, 0.08)',
    borderColor: '#667eea',
    borderWidth: 1.5,
  },
  choiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  choiceLetterBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  choiceLetter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#495057',
    lineHeight: 18,
  },
  choiceText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: '#495057',
  },
  navContainer: {
    height: 80,
    justifyContent: 'center',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  navButton: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevButton: {
    backgroundColor: '#6c757d',
  },
  nextButton: {
    backgroundColor: '#667eea',
  },
  disabledButton: {
    opacity: 0.5,
  },
  navButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 18,
  },
});