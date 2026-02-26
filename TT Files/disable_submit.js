jQuery(document).ready(function($) {
    setTimeout(function() {
        var form = $('form.elementor-form');
        var submitButton = form.find('button[type="submit"]');
        
        function checkFormValidity() {
            var isValid = true;
            var checkedFields = {};
            
            // Check all required fields, but skip duplicates
            form.find('input[required], select[required], textarea[required]').each(function() {
                var fieldName = $(this).attr('name');
                
                // Skip if we already checked this field name
                if (checkedFields[fieldName]) {
                    return;
                }
                checkedFields[fieldName] = true;
                
                // Check if field is visible (skip hidden fields)
                if (!$(this).is(':visible')) {
                    return;
                }
                
                var value = $(this).val();
                if (!value || value.trim() === '') {
                    isValid = false;
                    return false;
                }
            });
            
            // Check if at least one checkbox is checked
            var billsChecked = form.find('input[type="checkbox"]:checked').length;
            if (billsChecked === 0) {
                isValid = false;
            }
            
            // Enable/disable submit button
            if (isValid) {
                submitButton.prop('disabled', false).css({
                    'opacity': '1',
                    'cursor': 'pointer'
                });
            } else {
                submitButton.prop('disabled', true).css({
                    'opacity': '0.5',
                    'cursor': 'not-allowed'
                });
            }
        }
        
        checkFormValidity();
        
        form.on('input change keyup', 'input, select, textarea', function() {
            checkFormValidity();
        });
        
    }, 1000);
});
