import { Popper } from '../../../../lib.js';

/**
 * Quick Force Reply
 * Copyright (C) 2026 Bucko
 * Licensed under AGPL-3.0
 */

let popper = null;
let isOpen = false;
let popoverMenu = null;

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

function toggleMenu() {
    if (isOpen) {
        closeMenu();
    } else {
        openMenu();
    }
}

function openMenu() {
    isOpen = true;
    const members = getGroupMembers();
    
    if (!popoverMenu) {
        popoverMenu = $('<div id="quick-force-reply-popover"></div>');
        $('body').append(popoverMenu);
    }

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

    popoverMenu.css('display', 'flex');

    // THE MAGIC WE WERE MISSING: Letting Popper.js anchor it perfectly
    popper = Popper.createPopper(document.getElementById('quick-force-reply-btn'), document.getElementById('quick-force-reply-popover'), {
        placement: 'top-start',
    });
    popper.update();
}

function closeMenu() {
    isOpen = false;
    if (popoverMenu) {
        popoverMenu.css('display', 'none');
    }
    if (popper) {
        popper.destroy();
        popper = null;
    }
}

function forceReply(characterName) {
    closeMenu();
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
        closeMenu();
    }
}

jQuery(async () => {
const btnHtml = `
    <div id="quick-force-reply-btn" class="interactable" tabindex="0" title="Force Group Reply" style="display: none;">
        <i class="fa-solid fa-users fa-fw" style="pointer-events: none;"></i>
    </div>`;
    
    $('#leftSendForm').append(btnHtml);

    // Main button click
    $('#quick-force-reply-btn').on('click', () => {
        toggleMenu();
    });

    // Exact click-outside logic from QuickPersona
    $(document.body).on('click', (e) => {
        if (isOpen && !e.target.closest('#quick-force-reply-popover') && !e.target.closest('#quick-force-reply-btn')) {
            closeMenu();
        }
    });

    $(document).on('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            closeMenu();
        }
    });

    const ctx = SillyTavern.getContext();
    if (ctx && ctx.eventSource && ctx.eventTypes) {
        ctx.eventSource.on(ctx.eventTypes.CHAT_CHANGED, updateUIVisibility);
    }
    
    setTimeout(updateUIVisibility, 1000); 
});
