// CycleDashboard.jsx - USES PROPER SPECIALIZED API ENDPOINTS
import React, { useEffect, useState } from 'react';
import { useTheme } from './ThemeContext';
import { API_BASE_URL } from "../apiConfig";

const CycleDashboard = ({ onStartCycle }) => {
  const [groups, setGroups] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isDarkMode } = useTheme();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Loading dashboard data from specialized endpoints...');
      
      // ✅ USE YOUR SPECIALIZED ENDPOINTS
      const [groupsResponse, dashboardResponse] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/groups/detailed/`),    // Groups with progress
        fetch(`${API_BASE_URL}/quiz/dashboard/`)      // Dashboard stats
      ]);
      
      // ✅ PROCESS GROUPS DATA
      let groupsData = [];
      if (groupsResponse.status === 'fulfilled' && groupsResponse.value.ok) {
        const data = await groupsResponse.value.json();
        console.log('✅ Groups data:', data);
        
        if (data.groups && Array.isArray(data.groups)) {
          groupsData = data.groups;
        } else if (Array.isArray(data)) {
          groupsData = data;
        }
      } else {
        console.warn('⚠️ Groups detailed API failed, trying legacy endpoint...');
        
        // Fallback to legacy groups endpoint
        try {
          const fallbackResponse = await fetch(`${API_BASE_URL}/groups/summary/`);
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            console.log('✅ Legacy groups data:', fallbackData);
            
            // Convert legacy format to expected format
            groupsData = Array.isArray(fallbackData) ? fallbackData.map(group => ({
              group_number: group.group_number,
              total_words: group.total,
              words_started: group.studied,
              words_mastered: Math.floor(group.studied * 0.7), // Estimate
              is_completed: group.complete,
              completion_percentage: group.total > 0 ? Math.round((group.studied / group.total) * 100) : 0,
              mastery_threshold: 6,
              stats: {
                mastered: Math.floor(group.studied * 0.7),
                needPractice: Math.floor(group.studied * 0.3),
                dueReview: 0,
                notStarted: Math.max(0, group.total - group.studied)
              }
            })) : [];
          }
        } catch (fallbackError) {
          console.error('❌ Legacy groups endpoint also failed:', fallbackError);
        }
      }
      
      // ✅ PROCESS DASHBOARD STATS
      let stats = null;
      if (dashboardResponse.status === 'fulfilled' && dashboardResponse.value.ok) {
        stats = await dashboardResponse.value.json();
        console.log('✅ Dashboard stats:', stats);
      } else {
        console.warn('⚠️ Dashboard stats API failed');
      }
      
      // ✅ FALLBACK: If no specialized data, get basic words and process
      if (groupsData.length === 0) {
        console.log('📚 No specialized data found, falling back to basic words processing...');
        const wordsResponse = await fetch(`${API_BASE_URL}/words/`);
        if (wordsResponse.ok) {
          const allWords = await wordsResponse.json();
          groupsData = processWordsIntoGroups(allWords);
        }
      }
      
      setGroups(groupsData);
      setDashboardStats(stats);
      
      console.log(`✅ Dashboard loaded: ${groupsData.length} groups, stats available: ${!!stats}`);
      
    } catch (err) {
      console.error('❌ Failed to load dashboard:', err);
      setError(`Failed to load dashboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Helper function to process raw words into groups (fallback)
  const processWordsIntoGroups = (allWords) => {
    const groupsMap = {};
    
    allWords.forEach(word => {
      const groupNum = word.group_number || 1;
      if (!groupsMap[groupNum]) {
        groupsMap[groupNum] = [];
      }
      groupsMap[groupNum].push(word);
    });
    
    return Object.keys(groupsMap)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(groupNum => {
        const groupWords = groupsMap[groupNum];
        const mastered = groupWords.filter(w => (w.mastery || 0) >= 6).length;
        const needPractice = groupWords.filter(w => {
          const mastery = w.mastery || 0;
          return mastery > 0 && mastery < 6;
        }).length;
        const dueReview = groupWords.filter(w => w.is_due === true).length;
        const notStarted = groupWords.filter(w => (w.mastery || 0) === 0).length;
        
        return {
          group_number: parseInt(groupNum),
          total_words: groupWords.length,
          words_started: groupWords.length - notStarted,
          words_mastered: mastered,
          is_completed: mastered >= groupWords.length * 0.8,
          completion_percentage: Math.round((mastered / groupWords.length) * 100),
          mastery_threshold: 6,
          words: groupWords,
          stats: {
            mastered,
            needPractice,
            dueReview,
            notStarted
          }
        };
      });
  };

  const handleStartCycle = async (group) => {
    console.log('🚀 Starting cycle for group:', group.group_number);
    
    // ✅ ENHANCED: Get fresh words data for this group before starting
    try {
      const response = await fetch(`${API_BASE_URL}/words/by-criteria/?group=${group.group_number}&limit=50`);
      if (response.ok) {
        const data = await response.json();
        const groupWords = data.words || [];
        
        onStartCycle({
          groupNumber: group.group_number,
          totalWords: group.total_words,
          wordsStarted: group.words_started,
          wordsMastered: group.words_mastered,
          isCompleted: group.is_completed,
          words: groupWords // Fresh word data with current progress
        });
      } else {
        // Fallback with existing data
        onStartCycle({
          groupNumber: group.group_number,
          totalWords: group.total_words,
          wordsStarted: group.words_started,
          wordsMastered: group.words_mastered,
          isCompleted: group.is_completed,
          words: group.words || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch fresh words, using cached data:', error);
      onStartCycle({
        groupNumber: group.group_number,
        totalWords: group.total_words,
        wordsStarted: group.words_started,
        wordsMastered: group.words_mastered,
        isCompleted: group.is_completed,
        words: group.words || []
      });
    }
  };

  const getGroupStatus = (group) => {
    if (group.completion_percentage >= 80) return 'completed';
    if (group.words_started > 0) return 'in-progress';
    return 'not-started';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'in-progress': return 'text-warning';
      default: return 'text-secondary';
    }
  };

  const getStatusEmoji = (status) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in-progress': return '🔄';
      default: return '📚';
    }
  };

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-text)',
        padding: '2rem'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📊</div>
        <h2 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>Loading Dashboard...</h2>
        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center' }}>
          Fetching groups, progress, and statistics...
        </p>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-text)',
        padding: '2rem'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
        <h2 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>Dashboard Error</h2>
        <p style={{ 
          color: 'var(--color-text-secondary)', 
          textAlign: 'center',
          backgroundColor: 'var(--color-surface)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid var(--color-card-border)',
          marginBottom: '2rem',
          maxWidth: '500px'
        }}>
          {error}
        </p>
        <button 
          onClick={loadDashboardData}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-btn-primary-text)',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer'
          }}
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  // ✅ EMPTY STATE
  if (groups.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-background)',
        color: 'var(--color-text)',
        padding: '2rem'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📚</div>
        <h2 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>No Study Groups</h2>
        <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', maxWidth: '400px' }}>
          No vocabulary groups found. Make sure your database has words organized into groups.
        </p>
      </div>
    );
  }

  // ✅ SUCCESS STATE - RENDER DASHBOARD
  const totalWords = groups.reduce((sum, group) => sum + (group.total_words || 0), 0);
  const totalMastered = groups.reduce((sum, group) => sum + (group.words_mastered || 0), 0);
  const completedGroups = groups.filter(group => group.is_completed).length;

  return (
    <div style={{
      backgroundColor: 'var(--color-background)',
      color: 'var(--color-text)',
      minHeight: '100vh',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            fontWeight: 'bold', 
            margin: '0 0 1rem 0',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-teal-600))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            🎯 Study Groups Dashboard
          </h1>
          <p style={{ 
            fontSize: '1.2rem', 
            color: 'var(--color-text-secondary)', 
            margin: '0 0 2rem 0' 
          }}>
            Master vocabulary through structured Read → Quiz → Repeat cycles
          </p>
          
          {/* Stats Cards */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
            gap: '1rem', 
            maxWidth: '600px', 
            margin: '0 auto' 
          }}>
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-card-border)',
              borderRadius: '12px',
              padding: '1.5rem 1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                {groups.length}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Groups</div>
            </div>
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-card-border)',
              borderRadius: '12px',
              padding: '1.5rem 1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                {totalWords}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Total Words</div>
            </div>
            <div style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-card-border)',
              borderRadius: '12px',
              padding: '1.5rem 1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--color-success)' }}>
                {totalMastered}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Mastered</div>
            </div>
          </div>
        </div>

        {/* Dashboard Stats (if available) */}
        {dashboardStats && (
          <div style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-card-border)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--color-text)' }}>📊 Your Progress</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {dashboardStats.due_reviews && (
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-warning)' }}>
                    {dashboardStats.due_reviews.count || 0}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Due for Review</div>
                </div>
              )}
              {dashboardStats.low_mastery && (
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-error)' }}>
                    {dashboardStats.low_mastery.count || 0}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Need Practice</div>
                </div>
              )}
              {dashboardStats.streak && (
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                    {dashboardStats.streak.current_streak || 0} 🔥
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>Current Streak</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Groups Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', 
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          {groups.map((group) => {
            const status = getGroupStatus(group);
            const statusColor = getStatusColor(status);
            const statusEmoji = getStatusEmoji(status);
            
            return (
              <div 
                key={group.group_number}
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-card-border)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  position: 'relative',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                }}
              >
                {/* Status Badge */}
                <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{statusEmoji}</span>
                </div>

                {/* Group Header */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <div style={{
                      width: '3rem',
                      height: '3rem',
                      backgroundColor: 'var(--color-primary)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-btn-primary-text)',
                      fontSize: '1.2rem',
                      fontWeight: 'bold'
                    }}>
                      {group.group_number}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '600' }}>
                        Group {group.group_number}
                      </h3>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                        Words {((group.group_number - 1) * 30) + 1}-{group.group_number * 30}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Overall Progress</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{group.completion_percentage || 0}%</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    backgroundColor: 'var(--color-secondary)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${group.completion_percentage || 0}%`,
                      height: '100%',
                      backgroundColor: 'var(--color-primary)',
                      borderRadius: '4px',
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '0.75rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{
                    textAlign: 'center',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(var(--color-success-rgb, 33, 128, 141), 0.1)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-success)' }}>
                      {group.stats?.mastered || group.words_mastered || 0}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Mastered</div>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(var(--color-warning-rgb, 168, 75, 47), 0.1)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-warning)' }}>
                      {group.stats?.needPractice || Math.max(0, (group.words_started || 0) - (group.words_mastered || 0))}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Need Practice</div>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(var(--color-error-rgb, 192, 21, 47), 0.1)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-error)' }}>
                      {group.stats?.dueReview || 0}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Due Review</div>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    padding: '0.75rem',
                    backgroundColor: 'var(--color-secondary)',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-text)' }}>
                      {group.stats?.notStarted || Math.max(0, (group.total_words || 0) - (group.words_started || 0))}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Not Started</div>
                  </div>
                </div>

                {/* Action Button */}
                <button 
                  onClick={() => handleStartCycle(group)}
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--color-primary)',
                    color: 'var(--color-btn-primary-text)',
                    border: 'none',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'var(--color-primary-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'var(--color-primary)';
                  }}
                >
                  {status === 'completed' ? '🔄 Review' : 
                   status === 'in-progress' ? '📖 Continue' : '🚀 Start'}
                </button>
              </div>
            );
          })}
        </div>

        {/* How It Works */}
        <div style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-card-border)',
          borderRadius: '12px',
          padding: '2rem'
        }}>
          <h2 style={{ textAlign: 'center', margin: '0 0 2rem 0', fontSize: '1.5rem' }}>How It Works</h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '2rem',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📖</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>1. Read</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                Study vocabulary with examples, etymology, and memorable stories
              </p>
            </div>
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧠</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>2. Quiz</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                Test knowledge with adaptive questions and spaced repetition
              </p>
            </div>
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>3. Track</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                Monitor progress and identify words needing more practice
              </p>
            </div>
            <div>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>4. Repeat</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                Review until words are permanently mastered
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CycleDashboard;