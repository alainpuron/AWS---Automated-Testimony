
jQuery(document).ready(function($) {
    $('form.elementor-form').on('submit', function(e) {
        // Show loading message briefly (optional)
        console.log('Redirecting to thank you page...');
        
        // Redirect after half second
        setTimeout(function() {
            window.location.href = 'https://rmgo.org/thank-you-for-testifying/';
        }, 500);
    });
});
