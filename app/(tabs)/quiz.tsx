import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { HapticTab } from '../../components/haptic-tab';
import { ThemedView } from '../../components/themed-view';
import { questions as importedQuestions } from '../../data/questions';

const { width, height } = Dimensions.get('window');

type QuestionType = 'multiple' | 'truefalse' | 'checkbox';
type Question = {
  id: number | string;
  question: string;
  type: QuestionType;
  choices: Record<string, string>;
  answer: string | string[];
};

export default function QuizManagerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');
  const [questions, setQuestions] = useState<Question[]>(importedQuestions as Question[]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<Record<number, string[]>>({});
  const [isAnswerSelected, setIsAnswerSelected] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timerActive, setTimerActive] = useState(true);
  const [quizDuration, setQuizDuration] = useState(300); // 5 minutes default
  const [isTimerEnabled, setIsTimerEnabled] = useState(true);
  
  // Editing states
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>('multiple');
  const [choices, setChoices] = useState<Array<{key: string, value: string}>>([
    { key: 'A', value: '' },
    { key: 'B', value: '' },
    { key: 'C', value: '' },
    { key: 'D', value: '' },
  ]);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([]);

  const timerRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Check for reset parameter when screen loads
  useEffect(() => {
    if (params.reset === 'true') {
      // Reset the quiz when coming from results screen
      resetQuiz();
      // Clear the params
      router.setParams({ reset: undefined });
    }
  }, [params]);

  // Timer effect
  useEffect(() => {
    if (timerActive && isTimerEnabled && activeTab === 'preview') {
      timerRef.current = setInterval(() => {
        setTimeElapsed(prev => {
          if (prev >= quizDuration) {
            handleAutoSubmit();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerActive, isTimerEnabled, quizDuration, activeTab]);

  const handleAutoSubmit = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimerActive(false);
    calculateScore();
  };

  const handleAnswerSelect = (choiceKey: string) => {
    const currentQ = questions[currentQuestion];
    
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
      setIsAnswerSelected(
        selectedAnswers[currentQuestion + 1] !== undefined ||
        (selectedCheckboxes[currentQuestion + 1] && 
         selectedCheckboxes[currentQuestion + 1].length > 0)
      );
    } else {
      setTimerActive(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      calculateScore();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setIsAnswerSelected(
        selectedAnswers[currentQuestion - 1] !== undefined ||
        (selectedCheckboxes[currentQuestion - 1] && 
         selectedCheckboxes[currentQuestion - 1].length > 0)
      );
    }
  };

  const calculateScore = () => {
    let newScore = 0;
    
    questions.forEach((question, index) => {
      if (question.type === 'checkbox') {
        const selected = selectedCheckboxes[index] || [];
        const correctAnswers = Array.isArray(question.answer) ? question.answer : [question.answer];
        
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
    
    // Save highest score if needed
    const saveHighestScore = (score: number) => {
      try {
        const getHighestScore = () => {
          try {
            const saved = localStorage?.getItem('quizHighestScore');
            return saved ? parseInt(saved) : 0;
          } catch {
            return 0;
          }
        };
        
        const highestScore = getHighestScore();
        if (score > highestScore) {
          localStorage?.setItem('quizHighestScore', score.toString());
        }
      } catch (error) {
        console.log('Error saving score:', error);
      }
    };
    
    saveHighestScore(newScore);
    
    // Navigate to results screen with parameters
    router.push({
      pathname: '/(tabs)/results',
      params: { 
        score: newScore.toString(),
        totalQuestions: questions.length.toString(),
        timeElapsed: timeElapsed.toString()
      }
    });
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setSelectedCheckboxes({});
    setIsAnswerSelected(false);
    setTimeElapsed(0);
    setTimerActive(true);
  };

  // Question Management Functions
  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setNewQuestionText('');
    setNewQuestionType('multiple');
    setChoices([
      { key: 'A', value: '' },
      { key: 'B', value: '' },
      { key: 'C', value: '' },
      { key: 'D', value: '' },
    ]);
    setCorrectAnswers([]);
    setIsModalVisible(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setNewQuestionText(question.question);
    setNewQuestionType(question.type);
    
    // Handle different question types
    if (question.type === 'truefalse') {
      // For true/false questions, only show A: True and B: False
      setChoices([
        { key: 'A', value: 'True' },
        { key: 'B', value: 'False' },
      ]);
    } else {
      const choicesArray = Object.entries(question.choices).map(([key, value]) => ({
        key,
        value
      }));
      setChoices(choicesArray);
    }
    
    setCorrectAnswers(Array.isArray(question.answer) ? question.answer : [question.answer]);
    setIsModalVisible(true);
  };

  const handleDeleteQuestion = (index: number) => {
    Alert.alert(
      'Delete Question',
      'Are you sure you want to delete this question?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            const newQuestions = questions.filter((_, i) => i !== index);
            setQuestions(newQuestions);
            if (currentQuestion >= newQuestions.length && newQuestions.length > 0) {
              setCurrentQuestion(newQuestions.length - 1);
            }
          }
        }
      ]
    );
  };

  const handleSaveQuestion = () => {
    if (!newQuestionText.trim()) {
      Alert.alert('Error', 'Please enter a question');
      return;
    }

    // Handle choices based on question type
    let choicesObj: Record<string, string> = {};
    
    if (newQuestionType === 'truefalse') {
      // For true/false questions, always use these choices
      choicesObj = {
        A: 'True',
        B: 'False'
      };
    } else {
      // For other question types, use the entered choices
      choices.forEach(choice => {
        if (choice.value.trim()) {
          choicesObj[choice.key] = choice.value;
        }
      });
    }

    if (Object.keys(choicesObj).length === 0) {
      Alert.alert('Error', 'Please add at least one choice');
      return;
    }

    if (correctAnswers.length === 0) {
      Alert.alert('Error', 'Please select at least one correct answer');
      return;
    }

    const newQuestion: Question = {
      id: editingQuestion?.id || Date.now().toString(),
      question: newQuestionText,
      type: newQuestionType,
      choices: choicesObj,
      answer: newQuestionType === 'checkbox' ? correctAnswers : correctAnswers[0]
    };

    if (editingQuestion) {
      const index = questions.findIndex(q => q.id === editingQuestion.id);
      const updatedQuestions = [...questions];
      updatedQuestions[index] = newQuestion;
      setQuestions(updatedQuestions);
    } else {
      setQuestions([...questions, newQuestion]);
    }

    setIsModalVisible(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingQuestion(null);
    setNewQuestionText('');
    setNewQuestionType('multiple');
    setChoices([
      { key: 'A', value: '' },
      { key: 'B', value: '' },
      { key: 'C', value: '' },
      { key: 'D', value: '' },
    ]);
    setCorrectAnswers([]);
  };

  const addChoice = () => {
    if (newQuestionType === 'truefalse') {
      Alert.alert('Cannot Add Choice', 'True/False questions only have two choices: True and False.');
      return;
    }
    const lastKey = choices[choices.length - 1].key;
    const nextKey = String.fromCharCode(lastKey.charCodeAt(0) + 1);
    setChoices([...choices, { key: nextKey, value: '' }]);
  };

  const removeChoice = (index: number) => {
    if (newQuestionType === 'truefalse') {
      Alert.alert('Cannot Remove Choice', 'True/False questions must have both True and False choices.');
      return;
    }
    if (choices.length > 2) {
      const newChoices = choices.filter((_, i) => i !== index);
      setChoices(newChoices);
      
      // Remove from correct answers if it was selected
      const removedKey = choices[index].key;
      setCorrectAnswers(correctAnswers.filter(ans => ans !== removedKey));
    }
  };

  const updateChoice = (index: number, value: string) => {
    if (newQuestionType === 'truefalse') {
      // Don't allow editing true/false choices
      Alert.alert('Cannot Edit', 'True and False choices cannot be edited.');
      return;
    }
    const newChoices = [...choices];
    newChoices[index].value = value;
    setChoices(newChoices);
  };

  const toggleCorrectAnswer = (choiceKey: string) => {
    if (newQuestionType === 'checkbox') {
      if (correctAnswers.includes(choiceKey)) {
        setCorrectAnswers(correctAnswers.filter(ans => ans !== choiceKey));
      } else {
        setCorrectAnswers([...correctAnswers, choiceKey]);
      }
    } else {
      setCorrectAnswers([choiceKey]);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} seconds`;
    if (secs === 0) return `${mins} minute${mins > 1 ? 's' : ''}`;
    return `${mins} minute${mins > 1 ? 's' : ''} ${secs} second${secs > 1 ? 's' : ''}`;
  };

  const getTypeDisplay = (type: QuestionType) => {
    switch (type) {
      case 'multiple': return 'Multiple Choice';
      case 'truefalse': return 'True/False';
      case 'checkbox': return 'Multiple Select';
      default: return type;
    }
  };

  const getChoiceStyle = (choiceKey: string) => {
    const currentQ = questions[currentQuestion];
    const isSelected = currentQ.type === 'checkbox' 
      ? selectedCheckboxes[currentQuestion]?.includes(choiceKey)
      : selectedAnswers[currentQuestion] === choiceKey;
    
    return [
      styles.choiceButton,
      isSelected && styles.selectedChoice,
    ];
  };

  const progress = (currentQuestion + 1) / questions.length;
  const isLastQuestion = currentQuestion === questions.length - 1;

  // Animate progress when question changes
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: progress,
      tension: 60,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, [currentQuestion]);

  return (
    <ThemedView style={styles.container}>
      <LinearGradient
        colors={['#f8f9fa', '#e9ecef']}
        style={StyleSheet.absoluteFill}
      />

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'preview' && styles.activeTab]}
          onPress={() => setActiveTab('preview')}
        >
          <Text style={[styles.tabText, activeTab === 'preview' && styles.activeTabText]}>
            Preview Quiz
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
            Quiz Settings
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'preview' ? (
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.typeBox}>
                <Text style={styles.typeText}>
                  {getTypeDisplay(questions[currentQuestion]?.type || 'multiple')}
                </Text>
              </View>
              
              {isTimerEnabled && (
                <View style={[styles.timerBox, timeElapsed >= quizDuration * 0.8 && styles.warningTimer]}>
                  <Text style={[styles.timerText, timeElapsed >= quizDuration * 0.8 && styles.warningTimerText]}>
                    {formatTime(timeElapsed)} / {formatTime(quizDuration)}
                  </Text>
                </View>
              )}
              
              <View style={styles.counterBox}>
                <Text style={styles.counterText}>
                  {currentQuestion + 1}/{questions.length}
                </Text>
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
                {questions[currentQuestion]?.question || 'No question available'}
              </Text>
            </View>
          </View>

          {/* Choices - Using ScrollView to ensure all choices are visible */}
          <ScrollView 
            style={styles.choicesContainer}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.choicesContent}
          >
            {questions[currentQuestion] && Object.entries(questions[currentQuestion].choices).map(([key, value]) => (
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
          </ScrollView>

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
      ) : (
        <ScrollView style={styles.settingsContainer}>
          {/* Timer Settings */}
          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Timer Settings</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Enable Timer</Text>
              <Switch
                value={isTimerEnabled}
                onValueChange={setIsTimerEnabled}
                trackColor={{ false: '#767577', true: '#667eea' }}
                thumbColor={isTimerEnabled ? '#f4f3f4' : '#f4f3f4'}
              />
            </View>

            {isTimerEnabled && (
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Quiz Duration</Text>
                <View style={styles.durationContainer}>
                  <Text style={styles.durationText}>{formatDuration(quizDuration)}</Text>
                  <View style={styles.durationButtons}>
                    <TouchableOpacity
                      style={styles.durationButton}
                      onPress={() => setQuizDuration(Math.max(30, quizDuration - 30))}
                    >
                      <Text style={styles.durationButtonText}>-30s</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.durationButton}
                      onPress={() => setQuizDuration(quizDuration + 30)}
                    >
                      <Text style={styles.durationButtonText}>+30s</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Questions Management */}
          <View style={styles.settingsCard}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Questions ({questions.length})</Text>
              <TouchableOpacity style={styles.addButton} onPress={handleAddQuestion}>
                <Text style={styles.addButtonText}>+ Add Question</Text>
              </TouchableOpacity>
            </View>

            {questions.map((question, index) => (
              <View key={question.id} style={styles.questionItem}>
                <View style={styles.questionItemContent}>
                  <Text style={styles.questionItemNumber}>Q{index + 1}</Text>
                  <View style={styles.questionItemText}>
                    <Text style={styles.questionItemTitle} numberOfLines={2}>
                      {question.question}
                    </Text>
                    <Text style={styles.questionItemType}>
                      {getTypeDisplay(question.type)}
                    </Text>
                  </View>
                </View>
                <View style={styles.questionItemActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditQuestion(question)}
                  >
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteQuestion(index)}
                  >
                    <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Edit/Create Question Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </Text>

              <Text style={styles.inputLabel}>Question Text</Text>
              <TextInput
                style={styles.textInput}
                value={newQuestionText}
                onChangeText={setNewQuestionText}
                placeholder="Enter your question here..."
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Question Type</Text>
              <View style={styles.typeButtons}>
                {(['multiple', 'truefalse', 'checkbox'] as QuestionType[]).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      newQuestionType === type && styles.typeButtonActive,
                    ]}
                    onPress={() => {
                      setNewQuestionType(type);
                      // Reset choices when changing type
                      if (type === 'truefalse') {
                        setChoices([
                          { key: 'A', value: 'True' },
                          { key: 'B', value: 'False' },
                        ]);
                      } else if (type === 'multiple') {
                        setChoices([
                          { key: 'A', value: '' },
                          { key: 'B', value: '' },
                          { key: 'C', value: '' },
                          { key: 'D', value: '' },
                        ]);
                      } else {
                        setChoices([
                          { key: 'A', value: '' },
                          { key: 'B', value: '' },
                          { key: 'C', value: '' },
                          { key: 'D', value: '' },
                        ]);
                      }
                      setCorrectAnswers([]);
                    }}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      newQuestionType === type && styles.typeButtonTextActive,
                    ]}>
                      {getTypeDisplay(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Choices</Text>
              {newQuestionType === 'truefalse' ? (
                <View style={styles.trueFalseNote}>
                  <Text style={styles.trueFalseNoteText}>
                    True/False questions automatically have two choices: True and False.
                  </Text>
                </View>
              ) : (
                <>
                  {choices.map((choice, index) => (
                    <View key={index} style={styles.choiceInputRow}>
                      <Text style={styles.choiceLabel}>{choice.key}:</Text>
                      <TextInput
                        style={styles.choiceInput}
                        value={choice.value}
                        onChangeText={(text) => updateChoice(index, text)}
                        placeholder={`Choice ${choice.key}`}
                        editable={newQuestionType === 'multiple' || newQuestionType === 'checkbox'}
                      />
                      {(newQuestionType === 'multiple' || newQuestionType === 'checkbox') ? (
                        <TouchableOpacity
                          style={styles.removeChoiceButton}
                          onPress={() => removeChoice(index)}
                          disabled={choices.length <= 2}
                        >
                          <Text style={styles.removeChoiceButtonText}>×</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                  {(newQuestionType === 'multiple' || newQuestionType === 'checkbox') ? (
                    <TouchableOpacity style={styles.addChoiceButton} onPress={addChoice}>
                      <Text style={styles.addChoiceButtonText}>+ Add Choice</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              )}

              <Text style={styles.inputLabel}>Correct Answer(s)</Text>
              <Text style={styles.correctAnswerHint}>
                {newQuestionType === 'checkbox' 
                  ? 'Select all correct answers:'
                  : 'Select the correct answer:'}
              </Text>
              <View style={styles.correctAnswersContainer}>
                {choices.map((choice, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.correctAnswerButton,
                      correctAnswers.includes(choice.key) && styles.correctAnswerButtonActive,
                      (newQuestionType === 'truefalse' && !choice.value.trim()) && styles.disabledButton,
                      (!choice.value.trim() && (newQuestionType === 'multiple' || newQuestionType === 'checkbox')) && styles.disabledButton,
                    ]}
                    onPress={() => {
                      if (newQuestionType === 'truefalse' || choice.value.trim()) {
                        toggleCorrectAnswer(choice.key);
                      }
                    }}
                    disabled={((newQuestionType === 'multiple' || newQuestionType === 'checkbox') && !choice.value.trim())}
                  >
                    <Text style={[
                      styles.correctAnswerButtonText,
                      correctAnswers.includes(choice.key) && styles.correctAnswerButtonTextActive,
                    ]}>
                      {choice.key}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setIsModalVisible(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveQuestion}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: StatusBar.currentHeight || 50,
    paddingBottom: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#667eea',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  settingsContainer: {
    flex: 1,
    padding: 20,
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
  },
  timerBox: {
    backgroundColor: 'rgba(33, 37, 41, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  warningTimer: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
  },
  warningTimerText: {
    color: '#ff6b6b',
    fontWeight: '700',
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
    shadowOffset: { width: 0, height: 2 },
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
  choicesContent: {
    paddingBottom: 10,
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
    shadowOffset: { width: 0, height: 4 },
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
  },
  // Settings Styles
  settingsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  settingLabel: {
    fontSize: 16,
    color: '#495057',
  },
  durationContainer: {
    alignItems: 'flex-end',
  },
  durationText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
  },
  durationButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  durationButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  durationButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
  },
  addButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  questionItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  questionItemContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  questionItemNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#667eea',
    marginRight: 12,
    minWidth: 24,
  },
  questionItemText: {
    flex: 1,
  },
  questionItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
  },
  questionItemType: {
    fontSize: 12,
    color: '#6c757d',
  },
  questionItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 117, 125, 0.1)',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
  },
  deleteButtonText: {
    color: '#dc3545',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#212529',
    marginBottom: 20,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  typeButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  trueFalseNote: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.2)',
  },
  trueFalseNoteText: {
    fontSize: 14,
    color: '#667eea',
    textAlign: 'center',
    fontWeight: '500',
  },
  choiceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  choiceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    width: 24,
  },
  choiceInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: '#212529',
    marginHorizontal: 8,
  },
  removeChoiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeChoiceButtonText: {
    fontSize: 20,
    color: '#dc3545',
    fontWeight: 'bold',
  },
  addChoiceButton: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  addChoiceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
  },
  correctAnswerHint: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
  },
  correctAnswersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  correctAnswerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  correctAnswerButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  correctAnswerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
  },
  correctAnswerButtonTextActive: {
    color: 'white',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  saveButton: {
    backgroundColor: '#667eea',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});