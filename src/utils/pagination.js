const crypto = require('node:crypto');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const PAGE_SIZE = 10;
const EXPIRY_MS = 15 * 60_000;
const pages = new Map();

function buttons(token, page, totalPages) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lb:${token}:prev:${page}`)
      .setLabel('◀')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page === 0),
    new ButtonBuilder()
      .setCustomId(`lb:${token}:next:${page}`)
      .setLabel('▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1),
  )];
}

function register({ entries, render, ownerId }) {
  const token = crypto.randomBytes(12).toString('hex');
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const state = { entries, render, ownerId, totalPages, renderPage: null };
  pages.set(token, state);
  const timer = setTimeout(() => pages.delete(token), EXPIRY_MS);
  if (timer.unref) timer.unref();

  const renderPage = (page = 0) => {
    const safePage = Math.max(0, Math.min(page, totalPages - 1));
    const start = safePage * PAGE_SIZE;
    return {
      embeds: [render(entries.slice(start, start + PAGE_SIZE), start)],
      components: buttons(token, safePage, totalPages),
    };
  };
  state.renderPage = renderPage;
  return renderPage;
}

async function handleButton(interaction) {
  const match = /^lb:([a-f0-9]+):(prev|next):(\d+)$/.exec(interaction.customId);
  if (!match) return false;
  const state = pages.get(match[1]);
  if (!state) {
    await interaction.reply({ content: 'This leaderboard has expired. Run the command again.', ephemeral: true });
    return true;
  }
  if (state.ownerId && interaction.user.id !== state.ownerId) {
    await interaction.reply({ content: 'Only the person who ran this command can change its page.', ephemeral: true });
    return true;
  }
  const currentPage = Number(match[3]);
  const nextPage = currentPage + (match[2] === 'next' ? 1 : -1);
  await interaction.update(state.renderPage(nextPage));
  return true;
}

module.exports = { PAGE_SIZE, register, handleButton };
