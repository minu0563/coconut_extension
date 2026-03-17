document.addEventListener('DOMContentLoaded', () => {
  const salaryInput = document.getElementById('salary');
  const saveBtn = document.getElementById('saveBtn');
  const statusText = document.getElementById('status');

  // 기존에 저장된 데이터가 있으면 불러오기
  chrome.storage.local.get(['monthlySalary'], (result) => {
    if (result.monthlySalary) {
      salaryInput.value = result.monthlySalary;
    }
  });

  // 저장 버튼 클릭 시
  saveBtn.addEventListener('click', () => {
    const salary = parseInt(salaryInput.value, 10);
    
    if (isNaN(salary) || salary <= 0) {
      alert('올바른 금액을 입력해주세요.');
      return;
    }

    // 통상적인 한 달 근로시간 209시간을 기준으로 시급 계산
    const hourlyWage = Math.floor(salary / 209);

    chrome.storage.local.set({ 
      monthlySalary: salary,
      hourlyWage: hourlyWage 
    }, () => {
      statusText.style.display = 'block';
      setTimeout(() => { statusText.style.display = 'none'; }, 2000);
    });
  });
});