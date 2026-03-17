// 기본 시급 (스토리지에 값이 없을 때 대비)
let MY_HOURLY_WAGE = 10000; 
let isProcessing = false; // 무한 루프 방지용 플래그

function injectSweatEquity() {
  if (isProcessing) return;

  // 1. 탐색에서 제외할 태그 목록 (스크립트, 스타일, 입력창 등)
  const excludeTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'BUTTON']);
  
  const walker = document.createTreeWalker(
    document.body, 
    NodeFilter.SHOW_TEXT, 
    {
      acceptNode: function(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (excludeTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        // 뱃지 내부 텍스트는 다시 검사하지 않음
        if (parent.classList.contains('sweat-badge')) return NodeFilter.FILTER_REJECT;
        
        return NodeFilter.FILTER_ACCEPT;
      }
    }, 
    false
  );
  
  const nodesToProcess = [];
  const priceRegex = /\d[\d,]*\s*원/; 

  // 2. DOM을 순회하며 대상 노드 수집 (순회 중에는 DOM을 조작하지 않음)
  let node;
  while (node = walker.nextNode()) {
    if (priceRegex.test(node.textContent)) {
      // 텍스트 노드 바로 다음 형제 요소가 이미 뱃지인지 확인 (중복 방지)
      const nextSibling = node.nextSibling;
      if (nextSibling && nextSibling.nodeType === Node.ELEMENT_NODE && nextSibling.classList.contains('sweat-badge')) {
        continue; 
      }
      nodesToProcess.push(node);
    }
  }

  // 처리할 노드가 없으면 종료
  if (nodesToProcess.length === 0) return;

  // 3. 수집된 노드에 뱃지 삽입
  isProcessing = true;
  observer.disconnect(); // 뱃지를 추가하는 동안에는 옵저버 감지 중지 (무한 루프 방지)

  nodesToProcess.forEach(textNode => {
    const parent = textNode.parentElement;
    
    // 화면에 안 보이는 요소 건너뛰기
    if (!parent || window.getComputedStyle(parent).display === 'none') return;

    const priceText = textNode.textContent.match(priceRegex)[0];
    const price = parseInt(priceText.replace(/[^0-9]/g, ''));

    if (price > 0) {
      const hours = (price / MY_HOURLY_WAGE).toFixed(1);
      
      const badge = document.createElement('span');
      badge.className = 'sweat-badge';
      badge.textContent = ` (⏳ ${hours}h)`;
      
      badge.style.fontSize = '0.85em';
      badge.style.color = '#ff4d4f';
      badge.style.fontWeight = 'bold';
      badge.style.marginLeft = '4px';
      badge.style.cursor = 'help';
      badge.title = `당신의 인생 ${hours}시간과 맞바꿀 가치가 있나요?`;

      // 텍스트 노드 바로 뒤에 뱃지 삽입
      textNode.after(badge);
    }
  });

  // DOM 수정이 끝난 후 다시 감지 시작
  observer.observe(document.body, { childList: true, subtree: true });
  isProcessing = false;
}

// 팝업에서 월급 변경 시 기존 뱃지 지우고 다시 계산
function resetAndInject() {
  observer.disconnect(); // 삭제 중 감지 중지
  document.querySelectorAll('.sweat-badge').forEach(badge => badge.remove());
  observer.observe(document.body, { childList: true, subtree: true });
  
  injectSweatEquity();
}

// 성능 최적화를 위한 디바운스(Debounce) 적용
let timer;
const observer = new MutationObserver(() => {
  clearTimeout(timer);
  timer = setTimeout(injectSweatEquity, 500);
});

// 초기 실행 및 스토리지 데이터 가져오기
function init() {
  if (!document.body) {
    // 문서 로딩이 덜 끝났을 경우를 대비
    requestAnimationFrame(init);
    return;
  }
  
  observer.observe(document.body, { childList: true, subtree: true });

  chrome.storage.local.get(['hourlyWage'], (result) => {
    if (result.hourlyWage) {
      MY_HOURLY_WAGE = result.hourlyWage;
    }
    injectSweatEquity();
  });
}

init();

// 팝업 설정값 변경 이벤트
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.hourlyWage) {
    MY_HOURLY_WAGE = changes.hourlyWage.newValue;
    resetAndInject();
  }
});