/**
 * Quick Force Reply
 * Copyright (C) 2026 Bucko
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
*/

let popoverMenu;

function getGroupMembers() {
    const ctx = SillyTavern.getContext();
    if (!ctx || !ctx.groupId || !ctx.groups) return [];

    const group = ctx.groups.find(g => g.id === ctx.groupId);
    if (!group || !group.members) return [];

    const members = [];
    for (const memberId of group.members) {
        const charIndex = ctx.characters.findIndex(c => c.avatar === memberId);
        if (charIndex === -1) continue;
        const char = ctx.characters[charIndex];
        members.push({
            name: char.name || memberId,
            avatarUrl: `/characters/${encodeURIComponent(memberId)}`,
            disabled: group.disabled_members?.includes(memberId) || false,
        });
    }
    return members;
}

function openMenu() {
    const members = getGroupMembers();
    
    // Clear out old data
    popoverMenu.empty();
    popoverMenu.append('<div class="qfr-header">Force Reply</div>');

    if (members.length === 0) {
        popoverMenu.append('<div style="padding: 15px; text-align: center; opacity: 0.5;">No active group</div>');
    } else {
        members.forEach(member => {
            const row = $(`<div class="qfr-item ${member.disabled ? 'disabled' : ''}">
                <img class="qfr-avatar" src="${member.avatarUrl}" onerror="this.style.display='none'" />
                <span class="qfr-name">${member.name}</span>
                ${member.disabled ? '<span style="font-size: 0.7em; opacity: 0.5;">Muted</span>' : ''}
            </div>`);

            if (!member.disabled) {
                row.on('click', () => {
                    forceReply(member.name);
                });
            }
            popoverMenu.append(row);
        });
    }

    // --- DYNAMIC MOBILE-FRIENDLY POSITIONING ---
    const btn = $('#quick-force-reply-btn')[0];
    if (!btn) return; 
    
    const rect = btn.getBoundingClientRect(); 
    
    // THE FIX: visualViewport stops mobile keyboards from throwing the menu off-screen
    const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const bottomPos = vh - rect.top + 10;
    
    let leftPos = rect.left;
    const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
    if (leftPos + 250 > vw) { 
        leftPos = vw - 260; 
    }
    leftPos = Math.max(10, leftPos); 

    popoverMenu.css({
        bottom: bottomPos + 'px',
        left: leftPos + 'px',
        display: 'flex'
    });
}

function forceReply(characterName) {
    popoverMenu.css('display', 'none');
    const ctx = SillyTavern.getContext();
    if (ctx && typeof ctx.executeSlashCommandsWithOptions === 'function') {
        ctx.executeSlashCommandsWithOptions(`/trigger "${characterName}"`);
    }
}

function updateUIVisibility() {
    const ctx = SillyTavern.getContext();
    const isGroup = ctx && ctx.groupId;
    
    if (isGroup) {
        $('#quick-force-reply-btn').show();
    } else {
        $('#quick-force-reply-btn').hide();
        if (popoverMenu) popoverMenu.hide();
    }
}

jQuery(async () => {
    // THE FIX: 'pointer-events: none;' added to the <i> tag below so mobile phones stop misclicking the icon!
    const btnHtml = `
    <div id="quick-force-reply-btn" class="interactable" tabindex="0" title="Force Group Reply" style="display: none; padding: 10px; opacity: 0.7; cursor: pointer;">
        <i class="fa-solid fa-users" style="font-size: 1.2em; pointer-events: none;"></i>
    </div>`;
    
    // Injects into the exact same spot QuickPersona uses
    $('#leftSendForm').append(btnHtml);

    // 2. Create the Popover container
    popoverMenu = $('<div id="quick-force-reply-popover"></div>');
    $('body').append(popoverMenu);

    // 3. Click events
    $('#quick-force-reply-btn').on('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (popoverMenu.css('display') === 'flex') {
            popoverMenu.css('display', 'none');
        } else {
            openMenu();
        }
    });

    $(document).on('click', (e) => {
        if (!$(e.target).closest('#quick-force-reply-popover').length && !$(e.target).closest('#quick-force-reply-btn').length) {
            if (popoverMenu) popoverMenu.hide();
        }
    });

    $(document).on('keydown', (e) => {
        if (e.key === 'Escape' && popoverMenu) popoverMenu.hide();
    });

    // 4. Hook into chat change events
    const ctx = SillyTavern.getContext();
    if (ctx && ctx.eventSource && ctx.eventTypes) {
        ctx.eventSource.on(ctx.eventTypes.CHAT_CHANGED, updateUIVisibility);
    }
    
    setTimeout(updateUIVisibility, 1000); 
});
