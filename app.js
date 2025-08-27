import { classifyBloomLevel, BloomModel } from './bloomModel.js';

const els = {
  quiz: document.getElementById('quizContainer'),
  submit: document.getElementById('submitBtn'),
  result: document.getElementById('resultContainer'),
  exportCsv: document.getElementById('exportCsvBtn'),
  exportPdf: document.getElementById('exportPdfBtn'),
  progressBar: document.getElementById('progressBar'),
  progressBarContainer: document.getElementById('progressBarContainer')
};

let state = { questions: [], lang: 'en', score: 0 };

// --- Query params ---
function getQueryParams() {
  const params = {};
  const query = window.location.search.substring(1).split("&");
  query.forEach(pair => {
    const [key, value] = pair.split("=");
    params[key] = decodeURIComponent(value);
  });
  return params;
}

// --- Progress bar ---
function updateProgress(current, total) {
  els.progressBarContainer.style.display = 'block';
  els.progressBar.style.width = `${(current/total)*100}%`;
}

// --- Render quiz ---
function renderQuiz(questions, lang){
  els.quiz.innerHTML = '';
  questions.forEach((q,index) => {
    const questionText = lang==='si' ? q.question_si || q.question_en : q.question_en;
    const options = lang==='si' ? q.options_si || q.options_en : q.options_en;

    const div = document.createElement('div');
    div.className = 'question';
    div.innerHTML = `
      <p><strong>Q${index+1}:</strong> ${questionText}</p>
      <div class="bloom-tag">Bloom: ${classifyBloomLevel(questionText)}</div>
      <div class="options">
        ${options.map((val,i)=>`
          <label class="option">
            <input type="radio" name="q${index}" value="${i}">
            ${String.fromCharCode(65+i)}: ${val}
          </label>
        `).join('')}
      </div>
    `;
    els.quiz.appendChild(div);
  });

  els.submit.style.display='inline-block';
  els.exportCsv.style.display='inline-block';
  els.exportPdf.style.display='inline-block';
  els.result.innerHTML='';
  updateProgress(0, questions.length);
}

// --- Load questions ---
document.addEventListener('DOMContentLoaded', () => {
  const params = getQueryParams();
  const exam = params.exam || "OL";
  const subject = params.subject || "Science";
  const lang = params.lang || "en";
  state.lang = lang;

  if(!window.questions || !window.questions[exam] || !window.questions[exam][subject]){
    els.quiz.innerHTML = `<p style="color:red">No questions for ${subject} (${exam})</p>`;
    return;
  }

  state.questions = window.questions[exam][subject];
  renderQuiz(state.questions, lang);
});

// --- Submit ---
els.submit.addEventListener('click', () => {
  let score=0, results=[];
  state.questions.forEach((q,index)=>{
    const selected = document.querySelector(`input[name="q${index}"]:checked`);
    const correctIndex = q.answer;
    const options = state.lang==='si'?q.options_si||q.options_en:q.options_en;

    if(selected){
      const chosen=parseInt(selected.value);
      if(chosen===correctIndex){
        score++; BloomModel.recordResult(q,true);
        results.push(`<p style="color:green"><strong>Q${index+1}:</strong> Correct ✅</p>`);
      } else {
        BloomModel.recordResult(q,false);
        results.push(`<p style="color:red"><strong>Q${index+1}:</strong> Wrong ❌ (Your: ${options[chosen]}, Correct: ${options[correctIndex]})</p>`);
      }
    } else {
      BloomModel.recordResult(q,false);
      results.push(`<p style="color:orange"><strong>Q${index+1}:</strong> Not answered ⚠️</p>`);
    }

    updateProgress(index+1,state.questions.length);
  });

  state.score = score;
  els.result.innerHTML = `<h2>Result</h2><p><strong>Score:</strong> ${score}/${state.questions.length}</p>${results.join('')}`;
});

// --- Export CSV ---
els.exportCsv.addEventListener('click', ()=>{
  const rows=[['Q.No','Question','Options','Correct Answer']];
  state.questions.forEach((q,i)=>{
    const opts = (state.lang==='si'?q.options_si||q.options_en:q.options_en).join('|');
    const correct = (state.lang==='si'?q.options_si||q.options_en:q.options_en)[q.answer];
    rows.push([i+1,q.question_en,opts,correct]);
  });
  const csv = "data:text/csv;charset=utf-8," + rows.map(r=>r.join(",")).join("\n");
  const link=document.createElement("a");
  link.href = encodeURI(csv);
  link.download = "quiz.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// --- Export PDF ---
els.exportPdf.addEventListener('click', ()=>{
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 20;

  // Sinhala font
  if(state.lang==='si'){
    if(!window.NotoSansSinhala){ alert("Sinhala font not loaded!"); return;}
    doc.addFileToVFS("NotoSansSinhala.ttf", window.NotoSansSinhala);
    doc.addFont("NotoSansSinhala.ttf","NotoSansSinhala","normal");
    doc.setFont("NotoSansSinhala");
  } else {
    doc.setFont("helvetica");
  }

  doc.setFontSize(14);
  doc.text("Quiz Questions",10,y);
  y+=10;

  state.questions.forEach((q,i)=>{
    const questionText = state.lang==='si'? q.question_si||q.question_en : q.question_en;
    const splitText = doc.splitTextToSize(`${i+1}. ${questionText}`,180);
    doc.text(splitText,10,y);
    y+= splitText.length*7;
    if(y>270){ doc.addPage(); y=20; }
  });

  doc.save("quiz.pdf");
});
