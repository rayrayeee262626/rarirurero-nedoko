import {createPool, createRound, grade, QUESTION_COUNT, validateRoster} from './game.js';
import {statLabels, types} from './roster.js';

const game = document.querySelector('#game');
const percent = tenth => (tenth / 10).toFixed(1);
const displayType = type => `<span class="type type-${type.toLowerCase()}">${types[type]}</span>`;
const displayScore = tenths => tenths % 10 === 0 ? String(tenths / 10) : (tenths / 10).toFixed(1);
const MAX_SCORE = 100 * QUESTION_COUNT;

function card(set, role, modifier) {
  return `<article class="fighter ${modifier}">
    <div class="fighter-top"><span class="role">${role}</span>${set.mega ? '<span class="mega">メガシンカ済み</span>' : ''}</div>
    <h3>${set.label}</h3>
    <div class="types">${set.types.map(displayType).join('')}</div>
    <dl class="details">
      <div><dt>性格</dt><dd>${set.natureLabel}</dd></div>
      <div><dt>特性</dt><dd>${set.abilityLabel}</dd></div>
      <div><dt>持ち物</dt><dd>${set.itemLabel}</dd></div>
    </dl>
    <div class="sp-title">能力ポイント</div>
    <dl class="sp">${statLabels.map((label, i) => `<div class="${set.sp[i] ? 'invested' : ''}"><dt>${label}</dt><dd>${set.sp[i]}</dd></div>`).join('')}</dl>
  </article>`;
}

function start(pool) {
  const round = createRound(pool);
  const limit = Math.max(2000, Math.ceil(Math.max(...pool.map(q => q.high)) / 500) * 500);
  const history = [];
  draw();

  function draw(focus = false) {
    const question = round[history.length];
    const score = history.reduce((total, answer) => total + answer.scoreTenths, 0);
    if (!question) {
      game.innerHTML = `<section class="final-screen">
        <h2 tabindex="-1">練習終了</h2>
        <p class="final-score">${displayScore(score)}<span> / ${MAX_SCORE} 点</span></p>
        <p>${history.filter(answer => !answer.error).length} 問が正解範囲内</p>
        <button class="primary" id="restart">もう一度遊ぶ</button>
        <ol class="history">${history.map((answer, i) => `<li>
          <span class="history-number">${i + 1}</span>
          <div><strong>${round[i].move.label}</strong><small>${round[i].attacker.label} → ${round[i].defender.label}</small>
          <small>予想 ${percent(answer.guess)}% ／ 正解 ${percent(round[i].low)}–${percent(round[i].high)}%</small></div>
          <b>${displayScore(answer.scoreTenths)} 点</b></li>`).join('')}</ol>
      </section>`;
      game.querySelector('#restart').onclick = () => start(pool);
      game.querySelector('h2').focus();
      return;
    }

    const current = history.length + 1;
    const {attacker, defender, move} = question;
    game.innerHTML = `<section class="progress" aria-label="進捗">
        <div><strong>第 ${current} 問</strong><span> / ${QUESTION_COUNT}</span></div>
        <div><strong id="score">${displayScore(score)}</strong><span> / ${MAX_SCORE} 点</span></div>
        <div class="segments" aria-hidden="true">${round.map((_, i) => `<i class="${i < current - 1 ? 'done' : i === current - 1 ? 'active' : ''}"></i>`).join('')}</div>
      </section>
      <section aria-labelledby="prompt">
        <h2 id="prompt" tabindex="-1">どれくらいダメージが入る？</h2>
        <div class="matchup">${card(attacker, '攻撃側', 'attacker')}${card(defender, '防御側', 'defender')}</div>
        <div class="move-card">
          <span class="move-symbol" aria-hidden="true">✦</span>
          <div><span class="caption">使用する技</span><strong>${move.label}</strong></div>
          <div class="move-tags">${displayType(move.type)}<span>${move.category === 'Physical' ? '物理' : '特殊'}</span></div>
        </div>
        <p class="conditions">${question.terrain ? 'グラスフィールド' : 'フィールドなし'} · ${move.spread ? '複数体に命中（範囲補正あり）' : '単体に命中'} · 急所なし</p>
      </section>
      <section class="answer-card" aria-label="回答">
        <div class="guess-value"><label for="guess">ダメージ予想</label><output id="prediction" for="guess">50.0<small>%</small></output></div>
        <input type="range" id="guess" min="0" max="${limit}" value="500" step="1" aria-describedby="scale-help" aria-valuetext="50.0%">
        <div class="scale" aria-hidden="true"><span>0%</span><span>100%</span><span>${limit / 10}%</span></div>
        <p id="scale-help">最大HPに対する割合。100%を超える予想もできます。</p>
        <div class="adjust" aria-label="予想を調整">
          <button type="button" data-delta="-10">−1%</button>
          <button type="button" data-delta="-1">−0.1%</button>
          <button type="button" data-delta="1">＋0.1%</button>
          <button type="button" data-delta="10">＋1%</button>
        </div>
        <div id="feedback" aria-live="polite"></div>
        <button class="primary" id="action">回答する</button>
      </section>
      <details class="rules"><summary>出題条件と採点</summary>
        <p>防御側はHP満タン。表示された2体の場に出たときの特性を反映し、メガシンカは完了済みです。天候・状態異常・味方の補助はありません。範囲技は複数体に当たる場合で計算します。最大HPを超える計算ダメージもそのまま表示します。</p>
        <p>正解は小数第1位に丸めた乱数範囲です。範囲内は100点。範囲外は、最も近い端までのズレを100点から引きます。1パーセントポイントのズレで1点減点し、最低は0点です。</p>
      </details>`;

    if (focus) game.querySelector('h2').focus();
    const guess = game.querySelector('#guess');
    const prediction = game.querySelector('#prediction');
    const action = game.querySelector('#action');
    const adjust = game.querySelectorAll('[data-delta]');
    function update() {
      const value = percent(Number(guess.value));
      prediction.innerHTML = `${value}<small>%</small>`;
      guess.setAttribute('aria-valuetext', `${value}%`);
      guess.style.setProperty('--fill', `${Number(guess.value) * 100 / limit}%`);
    }
    update();
    game.querySelector('.scale').style.setProperty('--hp-marker', `${100000 / limit}%`);
    guess.oninput = update;
    for (const button of adjust) {
      button.onclick = () => {
        guess.value = String(Number(guess.value) + Number(button.dataset.delta));
        update();
      };
    }

    action.onclick = () => {
      const value = Number(guess.value);
      const answer = grade(value, question);
      history.push({...answer, guess: value});
      guess.disabled = true;
      for (const button of adjust) button.disabled = true;
      game.querySelector('#score').textContent = displayScore(score + answer.scoreTenths);
      game.querySelector('#feedback').innerHTML = `<div class="feedback ${answer.error ? '' : 'correct'}">
        <div><span>${answer.error ? '範囲まで ' + percent(answer.error) + ' ポイント' : '正解範囲内'}</span><b>＋${displayScore(answer.scoreTenths)} 点</b></div>
        <strong>${percent(question.low)}–${percent(question.high)}%</strong>
        <small>${question.min}–${question.max} ダメージ ／ 最大HP ${question.hp}</small>
      </div>`;
      action.textContent = current === QUESTION_COUNT ? '結果を見る' : '次の問題へ';
      action.onclick = () => draw(true);
    };
  }
}

try {
  validateRoster();
  start(createPool());
} catch (error) {
  console.error(error);
  game.innerHTML = '<p role="alert">問題を読み込めませんでした。ページを再読み込みしてください。</p>';
}
