import { useEffect } from 'react';
import { Typography, Spin, Card, Statistic, Row, Col, Alert, Button } from 'antd';
import {
  ThunderboltOutlined,
  FireOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { QuestionCard } from '../components/QuestionCard';
import { useStore } from '../lib/store';
import { getQuestionProgress, calculateStats } from '../lib/algorithm';

const { Title } = Typography;

const TrainingContent: React.FC = () => {
  const {
    state,
    questions,
    currentQuestionId,
    loadNextQuestion,
    submitAnswer,
    submitDontKnow,
    getQuestionById,
    clearFocusQueue,
  } = useStore();

  useEffect(() => {
    if (currentQuestionId === null) {
      loadNextQuestion();
    }
  }, [currentQuestionId, loadNextQuestion]);

  const question = currentQuestionId ? getQuestionById(currentQuestionId) : null;
  const progress = currentQuestionId ? getQuestionProgress(state, currentQuestionId) : undefined;
  const stats = calculateStats(questions, state);

  const hasFocusQueue = state.focusQueue && state.focusQueue.length > 0;

  const handleSubmit = (selectedIndex: number, isCorrect: boolean, selectedOptionKey: string, correctOptionKey: string) => {
    if (currentQuestionId) {
      submitAnswer(currentQuestionId, selectedIndex, isCorrect, selectedOptionKey, correctOptionKey);
    }
  };

  const handleNext = () => {
    loadNextQuestion();
  };

  const handleSkip = () => {
    loadNextQuestion();
  };

  const handleDontKnow = () => {
    if (currentQuestionId) {
      submitDontKnow(currentQuestionId);
    }
  };

  const handleClearFocusQueue = () => {
    clearFocusQueue();
    loadNextQuestion();
  };

  if (!question) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading question...</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <ThunderboltOutlined style={{ marginRight: 8 }} />
          Training Mode
        </Title>

        {hasFocusQueue && (
          <Alert
            message="Focus Training Active"
            description={`You're practicing ${state.focusQueue!.length} questions from your exam results.`}
            type="info"
            showIcon
            icon={<FireOutlined />}
            closable
            onClose={handleClearFocusQueue}
            action={
              <Button size="small" onClick={handleClearFocusQueue}>
                Exit Focus Mode
              </Button>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Questions Answered"
                value={state.globalCounter}
                prefix={<ThunderboltOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Mastered"
                value={stats.masteredCount}
                suffix={`/ ${stats.totalQuestions}`}
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Seen"
                value={stats.seenCount}
                suffix={`/ ${stats.totalQuestions}`}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small">
              <Statistic
                title="Unseen"
                value={stats.unseenCount}
                valueStyle={{ color: stats.unseenCount > 0 ? '#1890ff' : '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <QuestionCard
        question={question}
        progress={progress}
        onSubmit={handleSubmit}
        onNext={handleNext}
        onSkip={handleSkip}
        onDontKnow={handleDontKnow}
        showStats={true}
        showFeedback={true}
        mode="training"
      />
    </div>
  );
};

export const Training: React.FC = () => {
  return <TrainingContent />;
};
