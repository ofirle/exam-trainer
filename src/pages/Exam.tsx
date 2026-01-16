import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Card,
  Button,
  Space,
  Progress,
  Result,
  List,
  Tag,
  Radio,
  Divider,
  Statistic,
  Row,
  Col,
  Image,
} from 'antd';
import {
  PlayCircleOutlined,
  FileTextOutlined,
  TrophyOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  FireOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { QuestionCard } from '../components/QuestionCard';
import { useStore } from '../lib/store';
import type { ExamMode, Question } from '../lib/types';
import { CONFIG } from '../lib/constants';
import { reverseText } from '../lib/textUtils';

// Helper to get all images from a question (handles legacy single image)
const getQuestionImages = (question: Question): string[] => {
  if (question.images && question.images.length > 0) {
    return question.images;
  }
  if (question.image) {
    return [question.image];
  }
  return [];
};

const { Title, Text, Paragraph } = Typography;

// Start Screen Component
const ExamStartScreen: React.FC<{ onStart: (mode: ExamMode) => void }> = ({ onStart }) => {
  const [selectedMode, setSelectedMode] = useState<ExamMode>('random');
  const { questions } = useStore();

  const questionCount = Math.min(CONFIG.EXAM_QUESTION_COUNT, questions.length);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Card>
        <Title level={2} style={{ textAlign: 'center' }}>
          <FileTextOutlined style={{ marginRight: 8 }} />
          Exam Simulation
        </Title>

        <Paragraph style={{ textAlign: 'center', marginBottom: 32 }}>
          Test yourself with {questionCount} questions. Your progress will be tracked and
          used to improve your training.
        </Paragraph>

        <div style={{ marginBottom: 32 }}>
          <Text strong style={{ display: 'block', marginBottom: 16 }}>
            Select exam mode:
          </Text>
          <Radio.Group
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Card
                size="small"
                hoverable
                style={{
                  borderColor: selectedMode === 'random' ? '#1890ff' : undefined,
                }}
                onClick={() => setSelectedMode('random')}
              >
                <Radio value="random">
                  <Space>
                    <ThunderboltOutlined style={{ color: '#1890ff' }} />
                    <Text strong>Random Selection</Text>
                  </Space>
                </Radio>
                <Paragraph type="secondary" style={{ marginLeft: 24, marginBottom: 0 }}>
                  Questions are selected randomly from the entire question bank.
                  Good for general practice.
                </Paragraph>
              </Card>

              <Card
                size="small"
                hoverable
                style={{
                  borderColor: selectedMode === 'weak' ? '#1890ff' : undefined,
                }}
                onClick={() => setSelectedMode('weak')}
              >
                <Radio value="weak">
                  <Space>
                    <FireOutlined style={{ color: '#fa541c' }} />
                    <Text strong>Focus on Weak Areas</Text>
                  </Space>
                </Radio>
                <Paragraph type="secondary" style={{ marginLeft: 24, marginBottom: 0 }}>
                  Prioritizes questions you've answered incorrectly or haven't mastered yet.
                  Best for targeted improvement.
                </Paragraph>
              </Card>
            </Space>
          </Radio.Group>
        </div>

        <Button
          type="primary"
          size="large"
          block
          icon={<PlayCircleOutlined />}
          onClick={() => onStart(selectedMode)}
        >
          Start Exam
        </Button>
      </Card>
    </div>
  );
};

// Exam In Progress Component
const ExamInProgress: React.FC = () => {
  const { activeExam, getQuestionById, submitExamAnswer, skipExamQuestion } = useStore();
  const [showingFeedback, setShowingFeedback] = useState(false);

  if (!activeExam) return null;

  const currentQuestionId = activeExam.questionIds[activeExam.currentIndex];
  const question = getQuestionById(currentQuestionId);

  if (!question) return null;

  const progress = Math.round(
    (activeExam.currentIndex / activeExam.questionIds.length) * 100
  );

  const answeredCount = Object.keys(activeExam.answers).length;
  const correctCount = Object.values(activeExam.answers).filter((a) => a.isCorrect).length;

  const handleSubmit = (selectedIndex: number, isCorrect: boolean, selectedOptionKey: string, correctOptionKey: string) => {
    setShowingFeedback(true);
    submitExamAnswer(currentQuestionId, selectedIndex, isCorrect, selectedOptionKey, correctOptionKey);
  };

  const handleNext = () => {
    setShowingFeedback(false);
  };

  const handleSkip = () => {
    skipExamQuestion();
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Progress
              percent={progress}
              status="active"
              format={() => `${activeExam.currentIndex + 1} / ${activeExam.questionIds.length}`}
            />
          </Col>
          <Col>
            <Space split={<Divider type="vertical" />}>
              <Statistic
                title="Correct"
                value={correctCount}
                valueStyle={{ color: '#52c41a', fontSize: 20 }}
                prefix={<CheckCircleOutlined />}
              />
              <Statistic
                title="Wrong"
                value={answeredCount - correctCount}
                valueStyle={{ color: '#ff4d4f', fontSize: 20 }}
                prefix={<CloseCircleOutlined />}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      <QuestionCard
        key={currentQuestionId}
        question={question}
        onSubmit={handleSubmit}
        onSkip={handleSkip}
        showStats={false}
        showFeedback={true}
        mode="exam"
      />

      {showingFeedback && !activeExam.finished && (
        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Button type="primary" size="large" onClick={handleNext}>
            Next Question
          </Button>
        </div>
      )}
    </div>
  );
};

// Exam Summary Component
const ExamSummary: React.FC = () => {
  const navigate = useNavigate();
  const { activeExam, getQuestionById, finishExam, startFocusTraining } = useStore();

  if (!activeExam) return null;

  const totalQuestions = activeExam.questionIds.length;
  const answers = Object.entries(activeExam.answers);
  const correctCount = answers.filter(([, a]) => a.isCorrect).length;
  const wrongAnswers = answers.filter(([, a]) => !a.isCorrect);
  const score = Math.round((correctCount / totalQuestions) * 100);

  const getResultStatus = () => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getResultTitle = () => {
    if (score >= 80) return 'Excellent!';
    if (score >= 60) return 'Good Job!';
    return 'Keep Practicing!';
  };

  const handlePracticeWrongAnswers = () => {
    const wrongQuestionIds = wrongAnswers.map(([id]) => parseInt(id));
    startFocusTraining(wrongQuestionIds);
    finishExam();
    navigate('/training');
  };

  const handleFinish = () => {
    finishExam();
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Result
        status={getResultStatus()}
        icon={<TrophyOutlined />}
        title={getResultTitle()}
        subTitle={`You scored ${correctCount} out of ${totalQuestions} (${score}%)`}
        extra={[
          <Button key="new" type="primary" onClick={handleFinish}>
            Start New Exam
          </Button>,
          wrongAnswers.length > 0 && (
            <Button key="practice" onClick={handlePracticeWrongAnswers}>
              <FireOutlined />
              Practice Wrong Answers ({wrongAnswers.length})
            </Button>
          ),
        ]}
      />

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Questions"
              value={totalQuestions}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Correct Answers"
              value={correctCount}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Wrong Answers"
              value={wrongAnswers.length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {wrongAnswers.length > 0 && (
        <Card title="Questions to Review" style={{ marginTop: 16 }}>
          <List
            itemLayout="vertical"
            dataSource={wrongAnswers}
            renderItem={([questionId, answer]) => {
              const question = getQuestionById(parseInt(questionId));
              if (!question) return null;

              return (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color="red">#{question.id}</Tag>
                        {question.category && <Tag>{question.category}</Tag>}
                      </Space>
                    }
                    description={<span style={{ direction: 'rtl', display: 'block' }}>{reverseText(question.question)}</span>}
                  />
                  {getQuestionImages(question).length > 0 && (
                    <div style={{ margin: '12px 0', textAlign: 'center' }}>
                      <Image.PreviewGroup>
                        <Space wrap style={{ justifyContent: 'center' }}>
                          {getQuestionImages(question).map((img, idx) => (
                            <Image
                              key={idx}
                              src={img}
                              alt={`Question ${question.id} image ${idx + 1}`}
                              style={{ maxWidth: '100%', maxHeight: 200 }}
                            />
                          ))}
                        </Space>
                      </Image.PreviewGroup>
                    </div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text type="danger" style={{ direction: 'rtl', display: 'block' }}>
                        <CloseCircleOutlined style={{ marginRight: 8 }} />
                        Your answer: {question.options[answer.selectedIndex]?.key}.{' '}
                        {reverseText(question.options[answer.selectedIndex]?.text || '')}
                      </Text>
                      <Text type="success" style={{ direction: 'rtl', display: 'block' }}>
                        <CheckCircleOutlined style={{ marginRight: 8 }} />
                        Correct answer: {question.answer}.{' '}
                        {reverseText(question.options.find((opt) => opt.key === question.answer)?.text || '')}
                      </Text>
                    </Space>
                  </div>
                </List.Item>
              );
            }}
          />
        </Card>
      )}
    </div>
  );
};

// Main Exam Component
export const Exam: React.FC = () => {
  const { activeExam, startExam } = useStore();

  const handleStart = (mode: ExamMode) => {
    startExam(mode);
  };

  // No active exam - show start screen
  if (!activeExam) {
    return <ExamStartScreen onStart={handleStart} />;
  }

  // Exam finished - show summary
  if (activeExam.finished) {
    return <ExamSummary />;
  }

  // Exam in progress
  return <ExamInProgress />;
};
