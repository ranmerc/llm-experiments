document.addEventListener('DOMContentLoaded', () => {
    const circle = document.getElementById('circle');
    const timerEl = document.getElementById('timer');
    const doneButton = document.getElementById('done-button');
    const resultEl = document.getElementById('result');
    const centerContainer = document.getElementById('center-container');

    let numbers = [];
    let sum = 0;
    let timerInterval;
    let startTime;
    const numDigits = 7;

    function generateNumbers() {
        numbers = [];
        for (let i = 0; i < numDigits; i++) {
            numbers.push(Math.floor(Math.random() * 90) + 10);
        }
        sum = numbers.reduce((a, b) => a + b, 0);
    }

    function displayNumbers() {
        const existingNumbers = document.querySelectorAll('.number');
        existingNumbers.forEach(num => num.remove());

        const radius = circle.offsetWidth / 2;
        const centerX = circle.offsetWidth / 2;
        const centerY = circle.offsetHeight / 2;

        for (let i = 0; i < numDigits; i++) {
            const angle = (i / numDigits) * 2 * Math.PI - (Math.PI / 2); // Start from top
            const x = centerX + (radius) * Math.cos(angle) - 30; // 30 is half of number width/height
            const y = centerY + (radius) * Math.sin(angle) - 30;

            const numberEl = document.createElement('div');
            numberEl.classList.add('number');
            numberEl.textContent = numbers[i];
            numberEl.style.left = `${x}px`;
            numberEl.style.top = `${y}px`;
            circle.appendChild(numberEl);
        }
    }

    function startTimer() {
        startTime = Date.now();
        timerEl.textContent = '0.00s'; // Initialize with 's'
        timerInterval = setInterval(() => {
            const elapsedTime = (Date.now() - startTime) / 1000;
            timerEl.textContent = elapsedTime.toFixed(2) + 's';
        }, 100);
    }

    function stopTimer() {
        clearInterval(timerInterval);
        const elapsedTime = (Date.now() - startTime) / 1000;
        return elapsedTime.toFixed(2);
    }

    function showResult() {
        const timeTaken = stopTimer();
        resultEl.innerHTML = `<span class="sum-value">${sum}</span><span class="time-value">${timeTaken}s</span>`;
        resultEl.style.display = 'flex'; // Use flex to center sum and time vertically
        doneButton.style.display = 'none';
        centerContainer.classList.add('new-circle-active'); // Add class to indicate clickable state
    }

    function startGame() {
        generateNumbers();
        requestAnimationFrame(() => {
            displayNumbers();
            resultEl.style.display = 'none';
            doneButton.style.display = 'block';
            centerContainer.classList.remove('new-circle-active'); // Remove class
            timerEl.textContent = '0.00s'; // Reset timer display with 's'
            clearInterval(timerInterval);
            startTimer();
        });
    }

    doneButton.addEventListener('click', showResult);

    // Event listener for the center container to act as 'New Circle' button
    centerContainer.addEventListener('click', () => {
        if (centerContainer.classList.contains('new-circle-active')) {
            startGame();
        }
    });

    // Prevent doneButton click from bubbling to centerContainer
    doneButton.addEventListener('click', (event) => {
        event.stopPropagation();
    });


    // Initial game start
    startGame();

    // Adjust on resize to reposition numbers
    window.addEventListener('resize', displayNumbers);
});
