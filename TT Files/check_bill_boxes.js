
jQuery(document).ready(function($) {
    setTimeout(function() {
        // Check all bill checkboxes
        $('input[type="checkbox"][name*="bills"]').prop('checked', true);
    }, 500);
});
