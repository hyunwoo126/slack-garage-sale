/*
 * functions related to generating slack block kits
 */
  
const commaNumber = require('comma-number');
const { db, PostsApi } = require('./db-api');
const { APP_NAME, logger } = require('./utils');
const { generateInstallUrl, botClientFactory } = require('./slack-installer');

let divider = { type: 'divider' };

function headerBlock(text) {
  return {
    type: 'header',
    text: {
      type: 'plain_text',
      text,
      emoji: true,
    },
  };
}

const getMrkdwnBlock = (text, custom = {}) => {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text,
    },
    ...custom,
  };
};

const listPostActionButtons = (doc) => {
  return {
    'type': "actions",
    "elements": [
      {
        "type": "button",
        "text": {
          "type": "plain_text",
          "text": "Buy & Message Seller",
          "emoji": true
        },
        "style": "primary",
        "value": doc.id,
        "action_id": 'buy_message_seller',
      },
      {
        "type": "button",
        "text": {
          "type": "plain_text",
          "text": ":mag: View Image",
          "emoji": true
        },
        "value": doc.data().image,
        "action_id": 'view_image',
      },
    ]
  };
};

const myPostActionButtons = (doc) => {
  const { sold, deleted_at } = doc.data() || {};
  const elements = [];

  if (!sold) {
    elements.push({
      "type": "button",
      "text": {
        "type": "plain_text",
        "text": "Mark as Sold :tada:",
        "emoji": true,
      },
      "style": "danger",
      "value": doc.id,
      "action_id": "mark_as_sold"
    });
  }

  if (!sold && !deleted_at) {
    elements.push({
      "type": "button",
      "text": {
        "type": "plain_text",
        "text": "Remove Listing",
        "emoji": true,
      },
      "value": doc.id,
      "action_id": "delete_post",
    });
  }

  return elements.length ? {
    type: 'actions',
    elements,
  } : undefined;
};

const getPostBlock = ({
  display_name,
  title,
  description,
  price,
  date_posted,
  image,
  sold,
}, appendable = []) => {
  const ts = date_posted.seconds;
  const tsText = `<!date^${ts}^{date_short_pretty}|${ts}>`;

  let currentPost = [{
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `${display_name} listed *${title}* for $${commaNumber(price)} on ${tsText} \n :star: ${description}`,
    },
    "accessory" : {
      "type" : "image",
      "image_url": image,
      "alt_text": title,
    }
  }];

  if (sold) {
    currentPost.push({
      type: 'context',
      elements: [{
          type: 'mrkdwn',
          text: '*Sold* :lollipop:',
        }],
    });
  }

  return [
    ...currentPost,
    ...appendable,
    divider,
  ];
};

const sellThisItemBlock = (imageUrl) => {
  const blocks = [];
  blocks.push({
    type: 'image',
    image_url: imageUrl,
    alt_text: 'item for sale',
  });
  blocks.push({
    type: 'actions',
    elements: [{
      type: 'button',
      text: {
        type: 'plain_text',
        text: 'Sell This Item!',
        emoji: true,
      },
      value: imageUrl,
      action_id: 'sell_this_item',
    }],
  });

  return blocks;
};

function askPermissionBlock(url) {
  return [{
    block_id: `ask_permission_${Date.now()}`,
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": `To start selling, ${APP_NAME} needs permission to access your slack images.`,
    },
    "accessory": {
      "type": "button",
      "text": {
        "type": "plain_text",
        "text": "Give Permission",
        "emoji": true
      },
      "value": url,
      url,
      "action_id": 'give_permission',
    }
  }];
};

async function settingsBlock(userId) {
  let newItemNotificationEnabled = false;
  const userDoc = await db.collection('users').doc(userId).get();
  if (userDoc.exists) {
    const userData = userDoc.data();
    newItemNotificationEnabled = userData.newItemNotificationEnabled || false;
  }

  const newItemNotificationSection = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'New item notification',
    },
    accessory: {
      type: 'button',
      text: {
        type: 'plain_text',
        text: newItemNotificationEnabled ? 'Disable' : 'Enable',
        emoji: true,
      },
      style: newItemNotificationEnabled ? undefined : 'primary',
      value: newItemNotificationEnabled ? 'disable': 'enable',
      action_id: 'enable_new_item_notification',
    }
  };

  const refreshPageSection = {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: 'Refresh this page',
    },
    accessory: {
      type: 'button',
      text: {
        type: 'plain_text',
        text: 'Refresh',
        emoji: true,
      },
      action_id: 'refresh_home_tab',
    },
  };

  return [
    headerBlock('Settings :gear:'),
    divider,
    newItemNotificationSection,
    refreshPageSection,
  ];
};

module.exports = {
  divider,
  headerBlock,
  getMrkdwnBlock,
  getPostBlock,
  listPostActionButtons,
  myPostActionButtons,
  sellThisItemBlock,
  askPermissionBlock,
  settingsBlock,
};

