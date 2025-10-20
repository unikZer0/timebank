/**
 * Frontend JavaScript example for real-time National ID validation
 * This shows how to integrate the validation API with your form
 */

// Example HTML form integration
const nationalIdInput = document.getElementById('national_id');
const validationMessage = document.getElementById('validation-message');
const submitButton = document.getElementById('submit-button');

let validationTimeout;

// Real-time validation function
async function validateNationalId(nationalId) {
  try {
    const response = await fetch('/api/auth/validate-national-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ national_id: nationalId })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Validation error:', error);
    return {
      success: false,
      message: 'Network error during validation',
      errorCode: 'NETWORK_ERROR'
    };
  }
}

// Update UI based on validation result
function updateValidationUI(result) {
  const messageElement = validationMessage;
  
  if (result.success) {
    messageElement.innerHTML = `
      <div style="color: green;">
        ✅ ${result.message}
        <br>
        <small>Formatted: ${result.formattedId}</small>
        ${result.idInfo ? `<br><small>Type: ${result.idInfo.type}</small>` : ''}
      </div>
    `;
    messageElement.style.display = 'block';
    submitButton.disabled = false;
    nationalIdInput.style.borderColor = 'green';
  } else {
    let errorMessage = result.message;
    
    // Customize error messages for better UX
    switch (result.errorCode) {
      case 'INVALID_LENGTH':
        if (result.currentLength < 13) {
          errorMessage = `Please enter ${13 - result.currentLength} more digits`;
        } else {
          errorMessage = 'National ID must be exactly 13 digits';
        }
        break;
      case 'ALREADY_REGISTERED':
        errorMessage = 'This National ID is already registered in our system';
        break;
      case 'INVALID_CHECKSUM':
        errorMessage = 'Invalid National ID. Please check your input';
        break;
    }
    
    messageElement.innerHTML = `
      <div style="color: red;">
        ❌ ${errorMessage}
      </div>
    `;
    messageElement.style.display = 'block';
    submitButton.disabled = true;
    nationalIdInput.style.borderColor = 'red';
  }
}

// Event listener for input changes
nationalIdInput.addEventListener('input', function(e) {
  const value = e.target.value;
  
  // Clear previous timeout
  clearTimeout(validationTimeout);
  
  // Hide validation message while typing
  validationMessage.style.display = 'none';
  nationalIdInput.style.borderColor = '';
  
  // Only validate when exactly 13 digits are entered
  if (value.length === 13 && /^\d+$/.test(value)) {
    // Add small delay to avoid too many API calls
    validationTimeout = setTimeout(async () => {
      const result = await validateNationalId(value);
      updateValidationUI(result);
    }, 500); // 500ms delay
  } else if (value.length > 13) {
    // Show error immediately if too long
    updateValidationUI({
      success: false,
      message: 'National ID must be exactly 13 digits',
      errorCode: 'INVALID_LENGTH',
      currentLength: value.length
    });
  } else {
    // Reset button state
    submitButton.disabled = true;
  }
});

// Prevent non-numeric input (optional)
nationalIdInput.addEventListener('keypress', function(e) {
  // Allow backspace, delete, tab, escape, enter
  if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
      // Allow Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.keyCode === 65 && e.ctrlKey === true) ||
      (e.keyCode === 67 && e.ctrlKey === true) ||
      (e.keyCode === 86 && e.ctrlKey === true) ||
      (e.keyCode === 88 && e.ctrlKey === true)) {
    return;
  }
  // Ensure that it is a number and stop the keypress
  if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
    e.preventDefault();
  }
});

// Example HTML structure:
/*
<form id="registration-form">
  <div>
    <label for="national_id">เลขบัตรประชาชน (13 หลัก) *</label>
    <input 
      type="text" 
      id="national_id" 
      name="national_id" 
      placeholder="1234567890123"
      maxlength="13"
      required
    >
    <div id="validation-message" style="display: none; margin-top: 5px;"></div>
  </div>
  
  <button type="submit" id="submit-button" disabled>
    Register
  </button>
</form>
*/

// Additional utility functions
function formatNationalIdInput(input) {
  // Auto-format as user types (optional)
  let value = input.value.replace(/\D/g, '');
  if (value.length > 1) {
    value = value.slice(0, 1) + '-' + value.slice(1);
  }
  if (value.length > 6) {
    value = value.slice(0, 6) + '-' + value.slice(6);
  }
  if (value.length > 11) {
    value = value.slice(0, 11) + '-' + value.slice(11);
  }
  if (value.length > 14) {
    value = value.slice(0, 14) + '-' + value.slice(14);
  }
  input.value = value;
}

// Export for use in other modules
export { validateNationalId, updateValidationUI };
