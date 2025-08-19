// Bloom's Taxonomy Learning Goal Tracking System

// Bloom's Taxonomy Levels
export function createDefaultLevels() {
    return [
      { label: 'Erinnern', mastery: 0, stable: false },
      { label: 'Verstehen', mastery: 0, stable: false },
      { label: 'Anwenden', mastery: 0, stable: false },
      { label: 'Analysieren', mastery: 0, stable: false },
      { label: 'Evaluieren', mastery: 0, stable: false },
      { label: 'Kreieren', mastery: 0, stable: false }
    ];
  }

export class BloomTaxonomyTracker {
  constructor() {
    this.currentGoal = null;
    this.goalHistory = [];
    this.evidenceLog = [];
    this.sessionStartTime = Date.now();
  }

  setCurrentGoal(goalId, title, targetLevel, subgoalTitles = []) {
    console.log('🎯 Setting new learning goal:', title);
    
    // Create 6 Bloom taxonomy levels with initial data
    const levels = createDefaultLevels().map(level => ({
      ...level,
      mastery: 0, // Start with zero mastery
      stable: false
    }));

    // Create subgoals with their own Bloom levels
    const subgoals = subgoalTitles.map((subTitle, index) => ({
      subgoal_id: `${goalId}_sub_${index}`,
      title: subTitle,
      level_attained: 'Remember',
      levels: createDefaultLevels().map(level => ({
        ...level,
        mastery: 0,
        stable: false
      })),
      mastery_overall: 0,
      uncertainty_overall: 0.2,
      stable_overall: false,
      trend_week: 0,
      last_updated: Date.now()
    }));

    this.currentGoal = {
      goal_id: goalId,
      title: title,
      target_level: targetLevel,
      deadline: null,
      levels: levels,
      subgoals: subgoals,
      mastery_overall: 0,
      uncertainty_overall: 0.15,
      stable_overall: false,
      trend_week: 0,
      created_at: Date.now(),
      last_updated: Date.now()
    };
  }

  // Main method to update after each chat turn
  async updateAfterTurn(userMessage, assistantMessage, conversationHistory, learningProgress) {
    try {
      console.log('🎯 Updating Bloom tracker after turn');
      
      // Always return current goal data to prevent UI crashes
      const currentGoalData = this.getCurrentGoalData();
      
      // Use real learning analytics data instead of mock data
      if (learningProgress && learningProgress.topics && learningProgress.topics.length > 0) {
        const currentTopic = learningProgress.topics.find(t => t.id === learningProgress.currentTopic) || learningProgress.topics[0];
        
        // Create goal based on actual learning analytics
        this.setCurrentGoal(
          currentTopic.id,
          currentTopic.name,
          'Apply',
          currentTopic.subtopics ? currentTopic.subtopics.map(st => st.name || st) : ['Grundlagen', 'Vertiefung']
        );
        
        // Map real progress to Bloom levels
        this.mapProgressToBloomLevels(currentTopic, learningProgress);
        // Store time spent for UI display
        this.currentGoal.timeSpent = currentTopic.timeSpent || 0;
      } else {
        // Fallback if no learning analytics available
        if (!this.currentGoal) {
          this.setCurrentGoal(
            'general_learning',
            'Allgemeines Lernen',
            'Apply',
            ['Grundlagen', 'Vertiefung']
          );
        }
      }
      
      // Always return valid data structure
      const updatedGoalData = this.getCurrentGoalData();
      return updatedGoalData || currentGoalData;
    } catch (error) {
      console.error('❌ Error updating Bloom tracker:', error);
      // Return fallback data to prevent UI crash
      return this.getCurrentGoalData() || {
        goal_id: 'fallback',
        title: 'Lernziel wird geladen...',
        target_level: 'Apply',
        levels: createDefaultLevels(),
        subgoals: [],
        mastery_overall: 0,
        trend_week: 0,
        last_updated: Date.now()
      };
    }
  }

  // This method is no longer used - all data comes from real learning analytics

  // Map real learning progress to Bloom taxonomy levels
  mapProgressToBloomLevels(currentTopic, learningProgress) {
    if (!this.currentGoal) return;

    try {
      // Use actual progress data from learning analytics (1-5 scale)
      const topicProgress = currentTopic && typeof currentTopic.progress === 'number' ? currentTopic.progress : 1;
      const timeSpent = currentTopic && typeof currentTopic.timeSpent === 'number' ? currentTopic.timeSpent : 0;
      
      // Validate levels array exists
      if (!this.currentGoal.levels || !Array.isArray(this.currentGoal.levels)) {
        console.warn('Invalid levels array in currentGoal');
        return;
      }
      
      // Map Learning Analytics progress (1-5) to Bloom levels (0-1 mastery)
      this.currentGoal.levels.forEach((level, index) => {
        if (!level) return; // Skip invalid level objects
        
        // Map progress based on Bloom level hierarchy
        // Lower levels should be achieved first, higher levels need more progress
        let requiredProgress = index + 1; // Level 0 needs progress 1, Level 5 needs progress 6
        
        if (topicProgress >= requiredProgress) {
          // Full mastery if progress exceeds requirement
          level.mastery = Math.min(1.0, (topicProgress - requiredProgress + 1) / 2);
        } else if (topicProgress === requiredProgress - 1) {
          // Partial mastery if close to requirement
          level.mastery = 0.3;
        } else {
          // No mastery if far from requirement
          level.mastery = 0;
        }
        
        // Stability based on time spent (minutes) and mastery level
        // timeSpent from learningAnalytics is tracked in MINUTES
        level.stable = level.mastery > 0.6 && timeSpent >= 2; // at least 2 minutes on topic
      });
    } catch (error) {
      console.error('Error in mapProgressToBloomLevels:', error);
      return;
    }

    // Update subgoals based on subtopics - with safety checks
    if (this.currentGoal.subgoals && Array.isArray(this.currentGoal.subgoals)) {
      this.currentGoal.subgoals.forEach((subgoal, subIndex) => {
        if (!subgoal || !subgoal.levels || !Array.isArray(subgoal.levels)) return;
        
        const subtopic = currentTopic && currentTopic.subtopics && currentTopic.subtopics[subIndex];
        const subProgress = subtopic && subtopic.progress ? subtopic.progress : Math.max(1, topicProgress - 1);
        
        subgoal.levels.forEach((level, levelIndex) => {
          if (!level) return;
          
          let requiredProgress = levelIndex + 1;
          
          if (subProgress >= requiredProgress) {
            level.mastery = Math.min(1.0, (subProgress - requiredProgress + 1) / 2);
          } else if (subProgress === requiredProgress - 1) {
            level.mastery = 0.3;
          } else {
            level.mastery = 0;
          }
          
          level.stable = level.mastery > 0.6;
        });
        
        subgoal.mastery_overall = subgoal.levels.reduce((sum, level) => sum + (level ? level.mastery : 0), 0) / subgoal.levels.length;
        subgoal.trend_week = subProgress >= 3 ? 0.05 : subProgress >= 2 ? 0.02 : -0.01;
      });
    }

    // Update overall goal mastery
    this.currentGoal.mastery_overall = this.currentGoal.levels.reduce((sum, level) => sum + level.mastery, 0) / this.currentGoal.levels.length;
    this.currentGoal.trend_week = topicProgress >= 3 ? 0.03 : topicProgress >= 2 ? 0.01 : -0.01;
    this.currentGoal.last_updated = Date.now();
  }

  // Get current goal data for UI
  getCurrentGoalData() {
    if (!this.currentGoal) {
      return null;
    }

    return {
      goal_id: this.currentGoal.goal_id,
      title: this.currentGoal.title,
      target_level: this.currentGoal.target_level,
      deadline: this.currentGoal.deadline,
      levels: this.currentGoal.levels || [],
      subgoals: this.currentGoal.subgoals || [],
      mastery_overall: this.currentGoal.mastery_overall || 0,
      uncertainty_overall: this.currentGoal.uncertainty_overall || 0,
      trend_week: this.currentGoal.trend_week || 0,
      timeSpent: this.currentGoal.timeSpent || 0,
      created_at: this.currentGoal.created_at,
      last_updated: Date.now()
    };
  }
}
