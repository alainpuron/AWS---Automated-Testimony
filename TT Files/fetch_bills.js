
jQuery(document).ready(function($) {
    var billsContainer = $('.elementor-field-type-checkbox .elementor-field-subgroup');
    var form = billsContainer.closest('form');
    
    console.log('Form found:', form.length);
    console.log('Container found:', billsContainer.length);
    
    
    // === TEST URL ===
    var testJsonUrl = 'https://testimony-screenshots-rmgo.s3.us-west-2.amazonaws.com/config/bill-positions-TEST.json';
    
    // Fetch bill data from S3
    $.getJSON(testJsonUrl, function(data) {
        var now = new Date();
        var activeBills = [];
        var expiredCount = 0;
        
        // Filter active bills
        $.each(data.bills, function(index, bill) {
            var deadline = new Date(bill.deadline);
            if (deadline > now) {
                activeBills.push(bill);
            } else {
                expiredCount++;
            }
        });
        
        // Clear loading message
        billsContainer.html('');
        
        
        if (activeBills.length === 0) {
            billsContainer.append('<p style="color: #999;">No active bills</p>');
            return;
        }
        
        // Create checkbox options for active bills WITH name attribute
        $.each(activeBills, function(index, bill) {
            var deadline = new Date(bill.deadline);
            var timeRemaining = getTimeRemaining(deadline);
            var checkboxId = 'form-field-bills-' + index;
            
            var checkboxHtml = `
                <span class="elementor-field-option">
                    <input type="checkbox" 
                           value="${bill.number}" 
                           id="${checkboxId}" 
                           name="form_fields[bills][]"
                           class="bill-checkbox">
                    <label for="${checkboxId}">
                        <strong>${bill.number}</strong> | ${bill.title}
                        <br>

                    </label>
                </span>
            `;
            
            billsContainer.append(checkboxHtml);
        });
        
        
    }).fail(function(jqXHR, textStatus, errorThrown) {
        console.error('Failed to load bills:', textStatus, errorThrown);
    });
    
    function getTimeRemaining(deadline) {
        var now = new Date();
        var diff = deadline - now;
        if (diff < 0) return 'Expired';
        var hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 24) return hours + ' hrs';
        var days = Math.floor(hours / 24);
        return days + ' days';
    }
});

