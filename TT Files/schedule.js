
// Generates the committee schedule cards from bill-positions-TEST.json

jQuery(document).ready(function($) {
    // === TEST URL ===
    var jsonUrl = 'https://testimony-screenshots-rmgo.s3.us-west-2.amazonaws.com/config/bill-positions-TEST.json';
    
    var scheduleContainer = $('.committee-schedule-container'); // Adjust selector to match your HTML
    
    if (scheduleContainer.length === 0) {
        console.warn('Committee schedule container not found');
        return;
    }
    
    // Show loading with TEST indicator
    scheduleContainer.html('<p style="text-align: center; color: #999; padding: 20px;">Loading committee schedule... <strong>(TEST MODE)</strong></p>');
    
    // Fetch bill data
    $.getJSON(jsonUrl, function(data) {
        var now = new Date();
        var activeBills = [];
        
        // Filter active bills only
        $.each(data.bills, function(index, bill) {
            var deadline = new Date(bill.deadline);
            if (deadline > now) {
                activeBills.push(bill);
            }
        });
        
        // Clear loading
        scheduleContainer.html('');
        
    
        
        if (activeBills.length === 0) {
            scheduleContainer.append('<p style="text-align: center; color: #999; padding: 20px;">No upcoming committee hearings (all test bills expired)</p>');
            return;
        }
        
        // Sort bills by deadline (soonest first)
        activeBills.sort(function(a, b) {
            return new Date(a.deadline) - new Date(b.deadline);
        });
        
        // Generate schedule cards
        $.each(activeBills, function(index, bill) {
            var positionBadge = getPositionBadge(bill.position);
            var cardHtml = generateScheduleCard(bill, positionBadge);
            scheduleContainer.append(cardHtml);
        });
        
        console.log('Committee schedule loaded (TEST):', activeBills.length, 'bills');
        
    }).fail(function(jqXHR, textStatus, errorThrown) {
        console.error('Failed to load committee schedule:', textStatus, errorThrown);
        scheduleContainer.html(
            '<p style="text-align: center; color: #d63638; padding: 20px;"><strong>TEST MODE ERROR:</strong> Unable to load schedule. Please refresh the page.</p>'
        );
    });
    
    // Generate position badge HTML
    function getPositionBadge(position) {
        var badgeClass = '';
        var badgeText = position;
        
        switch(position.toLowerCase()) {
            case 'for':
            case 'support':
                badgeClass = 'support';
                badgeText = 'Support';
                break;
            case 'against':
            case 'oppose':
                badgeClass = 'oppose';
                badgeText = 'Oppose';
                break;
            case 'neutral':
                badgeClass = 'neutral';
                badgeText = 'Neutral';
                break;
            default:
                badgeClass = 'neutral';
        }
        
        return '<span class="position-badge position-' + badgeClass + '">' + badgeText + '</span>';
    }
    
    // Generate individual schedule card
    function generateScheduleCard(bill, positionBadge) {
        // Extract committee info if available, otherwise use defaults
        var committee = bill.committee || 'Test Committee';
        var location = bill.location || 'TEST ROOM 123';
        
        return `
            <div class="schedule-card">
                <div class="schedule-card-header">
                    <h3 class="bill-number">${bill.number}</h3>
                    ${positionBadge}
                </div>
                <div class="schedule-card-body">
                    <p class="bill-title">"${bill.title}"</p>
                    <p class="hearing-info">
                        <strong>${bill.hearing_date}, ${bill.hearing_time}, ${location}</strong><br>
                        ${committee}
                    </p>
                </div>
            </div>
        `;
    }
});

