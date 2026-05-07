// -----------------------------
// EmailJS setup
// -----------------------------
// This initializes EmailJS using your public key so the page can send email
// (for the GCash reference capture) directly from the browser.
emailjs.init('79wyieUxs4uQRAXBI');

// -----------------------------
// Calculator state variables
// -----------------------------
// display: the input box where we show numbers/results.
const display = document.getElementById('display');

// currentNumber: the number currently being typed (right side of operation).
let currentNumber = '';

// previousNumber: the number typed before an operator was chosen (left side).
let previousNumber = '';

// operation: stores selected operator (+, -, *, /) or '=' after calculation.
let operation = '';

// -----------------------------
// UI helper: sync screen with current value
// -----------------------------
function updateDisplay() {
	display.value = currentNumber;
}

// -----------------------------
// Number input handler (0-9)
// -----------------------------
function handleNumber(number) {
	// If the last action was equals, start a fresh number.
	if (operation === '=') {
		currentNumber = number;
		operation = '';
	} else if (currentNumber === '0') {
		// Replace leading zero with the new digit.
		currentNumber = number;
	} else {
		// Normal case: append digit to the current input.
		currentNumber += number;
	}

	// Reflect changes on calculator display.
	updateDisplay();
}

// -----------------------------
// Decimal point handler
// -----------------------------
function handleDecimal() {
	// If user just got a result, start a fresh decimal number.
	if (operation === '=') {
		currentNumber = '0.';
		operation = '';
	} else if (currentNumber === '') {
		// If nothing typed yet, begin with 0.
		currentNumber = '0.';
	} else if (!currentNumber.includes('.')) {
		// Prevent multiple decimal points in one number.
		currentNumber += '.';
	}

	// Update visible display.
	updateDisplay();
}

// -----------------------------
// Operator handler (+, -, *, /)
// -----------------------------
function handleOperator(op) {
	// If we already have a full expression, solve it first to support chaining
	// like: 2 + 3 + 4.
	if (previousNumber !== '' && currentNumber !== '' && operation !== '' && operation !== '=') {
		calculate();
	}

	// Save selected operation.
	operation = op;

	// Move current input into previousNumber if available.
	previousNumber = currentNumber !== '' ? currentNumber : previousNumber;

	// Clear currentNumber so user can type the second operand.
	currentNumber = '';

	// Show left operand + operator as visual feedback.
	display.value = previousNumber + ' ' + op;
}

// -----------------------------
// GCash payment state
// -----------------------------
// pendingResult temporarily stores the true answer while payment modal is open.
let pendingResult = null;

// -----------------------------
// Show GCash modal and reset its fields
// -----------------------------
function showGcashModal(result) {
	// Keep the real result hidden until verification is done.
	pendingResult = result;

	// Grab modal elements.
	const overlay = document.getElementById('gcash-overlay');
	const status = document.getElementById('gcash-status');
	const buttons = document.getElementById('gcash-buttons');
	const refInput = document.getElementById('gcash-ref-input');
	const refError = document.getElementById('gcash-ref-error');

	// Reset modal state every time it opens.
	status.style.display = 'none';
	buttons.style.display = 'block';
	refInput.value = '';
	refError.style.display = 'none';
	overlay.style.display = 'flex';
}

// -----------------------------
// "I already paid" button logic in GCash modal
// -----------------------------
document.getElementById('gcash-paid').addEventListener('click', () => {
	// Grab the current modal elements.
	const status = document.getElementById('gcash-status');
	const buttons = document.getElementById('gcash-buttons');
	const refInput = document.getElementById('gcash-ref-input');
	const refError = document.getElementById('gcash-ref-error');
	const referenceNumber = refInput.value.trim();

	// Require a reference number so your email has something to check.
	if (!referenceNumber) {
		refError.style.display = 'block';
		refInput.focus();
		return;
	}

	// Hide error if user entered something.
	refError.style.display = 'none';

	// Hide buttons and show status text during verification.
	buttons.style.display = 'none';
	status.style.display = 'block';
	status.textContent = 'Verifying payment...';

	// Send payment details to your email using EmailJS.
	emailjs.send('service_kiibzoc', 'template_93sfk0k', {
		reference_number: referenceNumber,
		calculation: previousNumber + ' = ' + pendingResult,
		time: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
	}).catch(() => {
		// ignore email failure to keep the flow smooth.
	});

	// Verification delay.
	setTimeout(() => {
		status.textContent = 'Payment confirmed! Processing...';

		// After second delay, close modal and reveal actual result.
		setTimeout(() => {
			document.getElementById('gcash-overlay').style.display = 'none';
			currentNumber = pendingResult.toString();
			operation = '=';
			previousNumber = '';
			updateDisplay();
			pendingResult = null;
		}, 1200);
	}, 1500);
});

// -----------------------------
// Cancel button in GCash modal
// -----------------------------
document.getElementById('gcash-cancel').addEventListener('click', () => {
	// Close modal and discard pending result.
	document.getElementById('gcash-overlay').style.display = 'none';
	pendingResult = null;
});

// -----------------------------
// Core calculator math function
// -----------------------------
function calculate() {
	// Guard clause: do nothing unless both operands exist.
	if (previousNumber === '' || currentNumber === '') return;

	let result;
	const prev = parseFloat(previousNumber);
	const current = parseFloat(currentNumber);

	// Execute math based on selected operator.
	switch (operation) {
		case '+':
			result = prev + current;
			break;
		case '-':
			result = prev - current;
			break;
		case '*':
			result = prev * current;
			break;
		case '/':
			// Handle division by zero safely.
			if (current === 0) {
				display.value = 'Error: Divide by 0';
				currentNumber = '';
				previousNumber = '';
				operation = '';
				return;
			}
			result = prev / current;
			break;
		default:
			// Unknown operator -> stop.
			return;
	}

	// Save result into state.
	currentNumber = result.toString();
	operation = '=';
	previousNumber = '';

	// Instead of showing result immediately, show payment modal first.
	showGcashModal(result);
}

// -----------------------------
// Reset calculator state + display
// -----------------------------
function clearCalculator() {
	currentNumber = '';
	previousNumber = '';
	operation = '';
	display.value = '';
}

// -----------------------------
// Attach click listeners to all number buttons
// -----------------------------
document.querySelectorAll('.number').forEach(button => {
	button.addEventListener('click', function () {
		// data-number comes from HTML button attributes.
		handleNumber(this.dataset.number);
	});
});

// -----------------------------
// Attach click listeners to all operator buttons
// -----------------------------
document.querySelectorAll('.operator').forEach(button => {
	button.addEventListener('click', function () {
		// data-operator comes from HTML button attributes.
		handleOperator(this.dataset.operator);
	});
});

// -----------------------------
// Equals and decimal button listeners
// -----------------------------
document.querySelector('.equals').addEventListener('click', calculate);
document.querySelector('.decimal').addEventListener('click', handleDecimal);

// -----------------------------
// Clear-password modal element references
// -----------------------------
const clearBtn = document.querySelector('#clear');
const modalOverlay = document.getElementById('modal-overlay');
const modalInput = document.getElementById('modal-input');
const modalMessage = document.getElementById('modal-message');

// -----------------------------
// Open clear-password modal
// -----------------------------
function showModal() {
	// Reset modal input/message whenever opened.
	modalInput.value = '';
	modalMessage.style.display = 'none';
	modalOverlay.style.display = 'flex';
	modalInput.focus();
}

// -----------------------------
// Close clear-password modal
// -----------------------------
function hideModal() {
	modalOverlay.style.display = 'none';
}

// -----------------------------
// Confirm clear with password
// -----------------------------
document.getElementById('modal-ok').addEventListener('click', () => {
	const password = 'bawalmagkamali';

	if (modalInput.value === password) {
		// Correct password: clear calculator.
		clearCalculator();
		hideModal();
		modalMessage.textContent = 'Cleared!';
		modalMessage.style.color = '#34c759';
		modalMessage.style.display = 'block';
		setTimeout(hideModal, 800);
	} else {
		// Wrong password: show error and keep modal open.
		modalMessage.textContent = 'Mali! Wrong password. Hint: "bawalmagkamali"';
		modalMessage.style.color = '#ff3b30';
		modalMessage.style.display = 'block';
		modalInput.value = '';
		modalInput.focus();
	}
});

// -----------------------------
// Cancel clear-password modal
// -----------------------------
document.getElementById('modal-cancel').addEventListener('click', hideModal);

// -----------------------------
// Keyboard support inside clear-password modal
// -----------------------------
modalInput.addEventListener('keydown', (e) => {
	// Enter triggers OK button logic.
	if (e.key === 'Enter') document.getElementById('modal-ok').click();
	// Escape closes modal.
	if (e.key === 'Escape') hideModal();
});

// -----------------------------
// Open clear modal when clear button is clicked
// -----------------------------
clearBtn.addEventListener('click', showModal);

// -----------------------------
// Global keyboard support for calculator
// -----------------------------
document.addEventListener('keydown', (event) => {
	const key = event.key;

	// Number keys: 0 to 9.
	if (key >= '0' && key <= '9') {
		handleNumber(key);
	} else if (['+', '-', '*', '/'].includes(key)) {
		// Operator keys.
		handleOperator(key);
	} else if (key === 'Enter' || key === '=') {
		// Equals via Enter or '=' key.
		calculate();
	} else if (key === '.') {
		// Decimal key.
		handleDecimal();
	} else if (key === 'Backspace') {
		// Backspace removes last typed digit from currentNumber.
		if (currentNumber.length > 0) {
			currentNumber = currentNumber.slice(0, -1);
			updateDisplay();
		}
	} else if (key === 'c' || key === 'C') {
		// C key opens the clear-password modal.
		clearBtn.click();
	}
});
