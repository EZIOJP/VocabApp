
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../apiConfig";

const TestWordFetch = () => {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupPreview, setGroupPreview] = useState([]);
  const [wordsPerGroup, setWordsPerGroup] = useState(30);
  const [currentGroupSummary, setCurrentGroupSummary] = useState([]);
  const [saveProgress, setSaveProgress] = useState(0);
  const [message, setMessage] = useState('');
// Add these state variables to your component:

// Add these state variables at the top of your component (after the existing useState declarations)
const [dataView, setDataView] = useState('compact'); // 'table', 'json', 'compact'
const [showWordCount, setShowWordCount] = useState(10);
  // Fetch all words
  const fetchWords = async () => {
    try {
      setLoading(true);
      setMessage('Fetching words...');

      const response = await fetch(`${API_BASE_URL}/words/`);
      if (!response.ok) throw new Error('Failed to fetch words');

      const data = await response.json();
      setWords(data);
      setMessage(`Loaded ${data.length} words successfully`);

      // Generate group preview
      generateGroupPreview(data, wordsPerGroup);

      // Fetch current group summary
      await fetchGroupSummary();

    } catch (error) {
      console.error('Error fetching words:', error);
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch current group summary
  const fetchGroupSummary = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/groups/summary/`);
      if (response.ok) {
        const summary = await response.json();
        setCurrentGroupSummary(summary);
      }
    } catch (error) {
      console.error('Error fetching group summary:', error);
    }
  };

  // Generate group preview
  const generateGroupPreview = (wordList, perGroup) => {
    const groups = [];
    const sortedWords = [...wordList].sort((a, b) => a.id - b.id);

    for (let i = 0; i < sortedWords.length; i += perGroup) {
      const groupWords = sortedWords.slice(i, i + perGroup);
      const groupNumber = Math.floor(i / perGroup) + 1;

      groups.push({
        groupNumber,
        wordCount: groupWords.length,
        words: groupWords,
        firstWord: groupWords[0]?.word || '',
        lastWord: groupWords[groupWords.length - 1]?.word || '',
        avgMastery: groupWords.reduce((sum, w) => sum + (w.mastery || 0), 0) / groupWords.length
      });
    }

    setGroupPreview(groups);
  };

  // Save group assignments
  const saveGroupAssignments = async () => {
    if (groupPreview.length === 0) {
      setMessage('No groups to save. Please fetch words first.');
      return;
    }

    try {
      setLoading(true);
      setSaveProgress(0);
      setMessage('Saving group assignments...');

      const totalWords = groupPreview.reduce((sum, group) => sum + group.words.length, 0);
      let processedWords = 0;
      let successCount = 0;
      let errorCount = 0;

      for (const group of groupPreview) {
        for (const word of group.words) {
          try {
            const response = await fetch(`${API_BASE_URL}/words/${word.id}/`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                group_number: group.groupNumber
              })
            });

            if (response.ok) {
              successCount++;
            } else {
              errorCount++;
              console.error(`Failed to update word ${word.id}: ${response.status}`);
            }

          } catch (error) {
            errorCount++;
            console.error(`Error updating word ${word.id}:`, error);
          }

          processedWords++;
          setSaveProgress((processedWords / totalWords) * 100);

          // Small delay to prevent overwhelming server
          if (processedWords % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        }
      }

      setMessage(`Save completed! Success: ${successCount}, Errors: ${errorCount}`);

      // Refresh data
      await fetchGroupSummary();

    } catch (error) {
      console.error('Error during save:', error);
      setMessage(`Save failed: ${error.message}`);
    } finally {
      setLoading(false);
      setSaveProgress(0);
    }
  };

  // Test a single word update
  const testSingleWordUpdate = async () => {
    if (words.length === 0) {
      setMessage('No words loaded. Please fetch words first.');
      return;
    }

    const testWord = words[0];
    setLoading(true);
    setMessage(`Testing update on word: ${testWord.word}`);

    try {
      const response = await fetch(`${API_BASE_URL}/words/${testWord.id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group_number: 999 // Test group number
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setMessage(`✅ Successfully updated ${testWord.word} to group ${updated.group_number}`);

        // Update the word in our local state
        setWords(prev => prev.map(w => 
          w.id === testWord.id ? { ...w, group_number: updated.group_number } : w
        ));
      } else {
        setMessage(`❌ Failed to update word: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.error('Test update error:', error);
      setMessage(`❌ Test update failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Export group assignments as JSON
  const exportGroupData = () => {
    const exportData = {
      metadata: {
        totalWords: words.length,
        totalGroups: groupPreview.length,
        wordsPerGroup: wordsPerGroup,
        exportDate: new Date().toISOString(),
        currentGroups: currentGroupSummary
      },
      newGroupAssignments: groupPreview.map(group => ({
        groupNumber: group.groupNumber,
        wordCount: group.wordCount,
        avgMastery: Math.round(group.avgMastery * 100) / 100,
        firstWord: group.firstWord,
        lastWord: group.lastWord,
        words: group.words.map(word => ({
          id: word.id,
          word: word.word,
          currentGroup: word.group_number,
          newGroup: group.groupNumber,
          mastery: word.mastery || 0
        }))
      }))
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `word-groups-test-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    setMessage('📥 Group data exported successfully!');
  };

  // Handle words per group change
  const handleWordsPerGroupChange = (e) => {
    const value = parseInt(e.target.value) || 30;
    setWordsPerGroup(value);
    if (words.length > 0) {
      generateGroupPreview(words, value);
    }
  };

  // Auto-fetch on component mount
  useEffect(() => {
    fetchWords();
  }, []);

  return (
    <div style={{ 
      fontFamily: 'monospace', 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333', borderBottom: '2px solid #007bff', paddingBottom: '10px' }}>
        🧪 Word Group Management Testing
      </h1>

      {/* Status & Controls */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '15px' }}>
          <strong>Status:</strong> <span style={{ color: loading ? '#ff9800' : '#28a745' }}>
            {loading ? '🔄 Processing...' : '✅ Ready'}
          </span>
        </div>

        <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <strong>Message:</strong> {message}
        </div>

        {saveProgress > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '5px' }}>
              <span>Save Progress:</span>
              <span>{Math.round(saveProgress)}%</span>
            </div>
            <div style={{ 
              width: '100%', 
              backgroundColor: '#e0e0e0', 
              borderRadius: '4px', 
              height: '8px' 
            }}>
              <div style={{ 
                width: `${saveProgress}%`, 
                backgroundColor: '#007bff', 
                height: '100%', 
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={fetchWords}
            disabled={loading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            🔄 Fetch Words
          </button>

          <button 
            onClick={testSingleWordUpdate}
            disabled={loading || words.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || words.length === 0 ? 'not-allowed' : 'pointer',
              opacity: loading || words.length === 0 ? 0.6 : 1
            }}
          >
            🧪 Test Single Update
          </button>

          <button 
            onClick={saveGroupAssignments}
            disabled={loading || groupPreview.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading || groupPreview.length === 0 ? 'not-allowed' : 'pointer',
              opacity: loading || groupPreview.length === 0 ? 0.6 : 1
            }}
          >
            💾 Save All Groups
          </button>

          <button 
            onClick={exportGroupData}
            disabled={groupPreview.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6f42c1',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: groupPreview.length === 0 ? 'not-allowed' : 'pointer',
              opacity: groupPreview.length === 0 ? 0.6 : 1
            }}
          >
            📥 Export JSON
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label>Words per group:</label>
            <input 
              type="number" 
              value={wordsPerGroup} 
              onChange={handleWordsPerGroupChange}
              min="1" 
              max="100"
              style={{ 
                width: '80px', 
                padding: '5px', 
                border: '1px solid #ccc', 
                borderRadius: '4px' 
              }}
            />
          </div>
        </div>
      </div>

      {/* Current Stats */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ color: '#007bff', margin: '0 0 10px 0' }}>Total Words</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{words.length}</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ color: '#28a745', margin: '0 0 10px 0' }}>Current Groups</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{currentGroupSummary.length}</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ color: '#6f42c1', margin: '0 0 10px 0' }}>New Groups</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{groupPreview.length}</div>
        </div>

        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <h3 style={{ color: '#fd7e14', margin: '0 0 10px 0' }}>Words per Group</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{wordsPerGroup}</div>
        </div>
      </div>

      {/* Current Group Distribution */}
      {currentGroupSummary.length > 0 && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          <h3 style={{ color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            📊 Current Group Distribution
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '15px' }}>
            {currentGroupSummary.map((group) => (
              <div key={group.group_number} style={{
                padding: '10px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                border: '1px solid #dee2e6',
                textAlign: 'center',
                minWidth: '120px'
              }}>
                <div style={{ fontWeight: 'bold', color: '#495057' }}>Group {group.group_number}</div>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>{group.word_count} words</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Group Preview */}
      {groupPreview.length > 0 && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          <h3 style={{ color: '#333', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
            🎯 New Group Preview ({wordsPerGroup} words per group)
          </h3>

          <div style={{ maxHeight: '400px', overflowY: 'auto', marginTop: '15px' }}>
            {groupPreview.map((group) => (
              <div key={group.groupNumber} style={{
                margin: '10px 0',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <span style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      Group {group.groupNumber}
                    </span>
                    <span style={{ fontWeight: '500' }}>{group.wordCount} words</span>
                    <span style={{ fontSize: '12px', color: '#6c757d' }}>
                      Avg Mastery: {Math.round(group.avgMastery)}%
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '14px', color: '#6c757d', marginBottom: '8px' }}>
                  <strong>Range:</strong> {group.firstWord} → {group.lastWord}
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {group.words.slice(0, 10).map((word) => (
                    <span key={word.id} style={{
                      backgroundColor: '#e9ecef',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      color: '#495057'
                    }}>
                      {word.word}
                    </span>
                  ))}
                  {group.words.length > 10 && (
                    <span style={{
                      backgroundColor: '#6c757d',
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '10px',
                      fontSize: '11px'
                    }}>
                      +{group.words.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Data (collapsed by default) */}
     <details style={{ 
  backgroundColor: 'white', 
  padding: '20px', 
  borderRadius: '8px',
  marginBottom: '20px'
}}>
  <summary style={{ 
    cursor: 'pointer', 
    fontWeight: 'bold', 
    color: '#333',
    marginBottom: '10px'
  }}>
    📋 Raw Word Data ({words.length} words) - Click to expand
  </summary>

  {/* Table View for better readability */}
  <div style={{ marginBottom: '15px' }}>
    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
      <button 
        onClick={() => setDataView('table')}
        style={{
          padding: '5px 12px',
          backgroundColor: dataView === 'table' ? '#007bff' : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        📊 Table View
      </button>
      <button 
        onClick={() => setDataView('json')}
        style={{
          padding: '5px 12px',
          backgroundColor: dataView === 'json' ? '#007bff' : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        📄 JSON View
      </button>
      <button 
        onClick={() => setDataView('compact')}
        style={{
          padding: '5px 12px',
          backgroundColor: dataView === 'compact' ? '#007bff' : '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        📝 Compact View
      </button>
    </div>

    {/* Show first 10 words input */}
    <div style={{ marginBottom: '10px' }}>
      <label style={{ fontSize: '12px', marginRight: '8px' }}>Show first:</label>
      <input 
        type="number" 
        value={showWordCount} 
        onChange={(e) => setShowWordCount(Math.min(parseInt(e.target.value) || 10, words.length))}
        min="1" 
        max={words.length}
        style={{ 
          width: '60px', 
          padding: '2px 6px', 
          border: '1px solid #ccc', 
          borderRadius: '3px',
          fontSize: '12px'
        }}
      />
      <span style={{ fontSize: '12px', marginLeft: '8px', color: '#6c757d' }}>
        words (max: {words.length})
      </span>
    </div>
  </div>

  {/* Table View */}
  {dataView === 'table' && (
    <div style={{ 
      overflowX: 'auto',
      maxHeight: '500px',
      overflowY: 'auto',
      border: '1px solid #dee2e6',
      borderRadius: '4px'
    }}>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        fontSize: '11px',
        backgroundColor: 'white'
      }}>
        <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0 }}>
          <tr>
            <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>ID</th>
            <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>Word</th>
            <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>Pronunciation</th>
            <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>Meaning</th>
            <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>Group</th>
            <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>Mastery</th>
            <th style={{ padding: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>Source</th>
          </tr>
        </thead>
        <tbody>
          {words.slice(0, showWordCount).map((word, index) => (
            <tr key={word.id} style={{ 
              backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa'
            }}>
              <td style={{ padding: '6px', border: '1px solid #dee2e6' }}>{word.id}</td>
              <td style={{ 
                padding: '6px', 
                border: '1px solid #dee2e6',
                fontWeight: 'bold',
                color: '#007bff'
              }}>
                {word.word}
              </td>
              <td style={{ padding: '6px', border: '1px solid #dee2e6', fontStyle: 'italic' }}>
                {word.pronunciation !== 'N/A' ? word.pronunciation : '-'}
              </td>
              <td style={{ 
                padding: '6px', 
                border: '1px solid #dee2e6',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {word.meaning || '-'}
              </td>
              <td style={{ 
                padding: '6px', 
                border: '1px solid #dee2e6',
                textAlign: 'center'
              }}>
                <span style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '10px'
                }}>
                  {word.group_number}
                </span>
              </td>
              <td style={{ 
                padding: '6px', 
                border: '1px solid #dee2e6',
                textAlign: 'center'
              }}>
                <span style={{
                  color: word.mastery >= 70 ? '#28a745' : word.mastery >= 40 ? '#ffc107' : '#dc3545',
                  fontWeight: 'bold'
                }}>
                  {word.mastery || 0}%
                </span>
              </td>
              <td style={{ 
                padding: '6px', 
                border: '1px solid #dee2e6',
                fontSize: '10px',
                color: '#6c757d'
              }}>
                {word.source !== 'Unknown' ? word.source : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {words.length > showWordCount && (
        <div style={{ 
          padding: '10px', 
          textAlign: 'center', 
          backgroundColor: '#f8f9fa',
          fontSize: '12px',
          color: '#6c757d'
        }}>
          ... and {words.length - showWordCount} more words
        </div>
      )}
    </div>
  )}

  {/* Compact View */}
  {dataView === 'compact' && (
    <div style={{ 
      maxHeight: '400px', 
      overflowY: 'auto',
      backgroundColor: '#f8f9fa', 
      padding: '15px', 
      borderRadius: '4px'
    }}>
      {words.slice(0, showWordCount).map((word, index) => (
        <div key={word.id} style={{ 
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid #dee2e6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ 
              fontWeight: 'bold', 
              color: '#007bff',
              fontSize: '14px'
            }}>
              {index + 1}. {word.word}
            </span>
            <span style={{ 
              fontSize: '11px', 
              color: '#6c757d',
              fontStyle: 'italic'
            }}>
              {word.pronunciation !== 'N/A' ? `(${word.pronunciation})` : ''}
            </span>
            <span style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '1px 5px',
              borderRadius: '8px',
              fontSize: '9px'
            }}>
              Group {word.group_number}
            </span>
            <span style={{
              backgroundColor: word.mastery >= 70 ? '#28a745' : word.mastery >= 40 ? '#ffc107' : '#dc3545',
              color: 'white',
              padding: '1px 5px',
              borderRadius: '8px',
              fontSize: '9px'
            }}>
              {word.mastery || 0}%
            </span>
          </div>
          <div style={{ 
            fontSize: '12px', 
            color: '#495057',
            lineHeight: '1.3'
          }}>
            {word.meaning ? (word.meaning.length > 100 ? word.meaning.substring(0, 100) + '...' : word.meaning) : 'No meaning available'}
          </div>
          {word.etymology && word.etymology !== '' && (
            <div style={{ 
              fontSize: '10px', 
              color: '#6c757d',
              marginTop: '2px',
              fontStyle: 'italic'
            }}>
              Etymology: {word.etymology.length > 80 ? word.etymology.substring(0, 80) + '...' : word.etymology}
            </div>
          )}
        </div>
      ))}
      {words.length > showWordCount && (
        <div style={{ 
          textAlign: 'center', 
          fontSize: '12px',
          color: '#6c757d',
          fontStyle: 'italic',
          marginTop: '10px'
        }}>
          ... and {words.length - showWordCount} more words
        </div>
      )}
    </div>
  )}

  {/* JSON View (original) */}
  {dataView === 'json' && (
    <pre style={{ 
      backgroundColor: '#f8f9fa', 
      padding: '15px', 
      borderRadius: '4px', 
      overflow: 'auto',
      maxHeight: '400px',
      fontSize: '11px',
      lineHeight: '1.4'
    }}>
      {JSON.stringify(words.slice(0, showWordCount), null, 2)}
      {words.length > showWordCount && `\n\n... and ${words.length - showWordCount} more words`}
    </pre>
  )}
</details>

      {/* Warning */}
      {groupPreview.length > 0 && (
        <div style={{ 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          padding: '15px', 
          borderRadius: '8px',
          color: '#856404'
        }}>
          <strong>⚠️ Warning:</strong> Clicking "Save All Groups" will update the group_number field for all {words.length} words in your database. 
          This action cannot be undone easily. Make sure to export your current data first!
        </div>
      )}
    </div>
  );
};

export default TestWordFetch;
