export function classifyBloomLevel(questionText) {
  const keywords = {
    Remember: ["define", "list", "recall", "what", "when", "who"],
    Understand: ["explain", "summarize", "describe", "interpret"],
    Apply: ["use", "apply", "solve", "demonstrate"],
    Analyze: ["compare", "contrast", "analyze", "differentiate"],
    Evaluate: ["evaluate", "judge", "critique", "assess"],
    Create: ["design", "create", "develop", "formulate"]
  };

  for (let level in keywords) {
    for (let word of keywords[level]) {
      if (questionText.toLowerCase().includes(word)) return level;
    }
  }
  return "General";
}

export const BloomModel = {
  results: {},

  recordResult(question, correct) {
    const key = question.question_en;
    if (!this.results[key]) {
      this.results[key] = { attempts: 0, correct: 0 };
    }
    this.results[key].attempts++;
    if (correct) this.results[key].correct++;
  },

  pickNext(questions) {
    questions.sort((a, b) => {
      const ra = this.results[a.question_en];
      const rb = this.results[b.question_en];
      const sa = ra ? ra.correct / ra.attempts : 0;
      const sb = rb ? rb.correct / rb.attempts : 0;
      return sa - sb; 
    });
    return questions[0] || questions[Math.floor(Math.random() * questions.length)];
  },

  getBloomStats() {
    const stats = {};
    for (let q in this.results) {
      const level = classifyBloomLevel(q);
      if (!stats[level]) stats[level] = { attempts: 0, correct: 0 };
      stats[level].attempts += this.results[q].attempts;
      stats[level].correct += this.results[q].correct;
    }
    return stats;
  },

  reset() {
    this.results = {};
  }
};
