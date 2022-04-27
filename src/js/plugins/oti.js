import defaults from '../config/defaults';
import { emptyElement } from '../utils/elements';
import i18n from '../utils/i18n';
import is from '../utils/is';
import { extend } from '../utils/objects';

const MENU_TYPE_MIRROR_MODE = 'mirror';
const MIRROR_MODE_OFF = 0;
const MIRROR_MODE_ON = 1;
const MIRROR_MODE_VALUES = [MIRROR_MODE_OFF, MIRROR_MODE_ON];

extend(defaults, {
    frameDuration: 1 / 30, // approximation - getting the real framerate is hard
    [MENU_TYPE_MIRROR_MODE]: {
        default: MIRROR_MODE_OFF,
        selected: MIRROR_MODE_OFF,
        options: MIRROR_MODE_VALUES
    },
    i18n: {
        [MENU_TYPE_MIRROR_MODE]: "Mirror",
        [`${MENU_TYPE_MIRROR_MODE}Label${MIRROR_MODE_OFF}`]: "Off",
        [`${MENU_TYPE_MIRROR_MODE}Label${MIRROR_MODE_ON}`]: "On",
    }
});

class OtiPlugin {

    keyHandler = {};

    constructor(player, controls) {
        this.player = player;
        this.controls = controls;
        player.options[MENU_TYPE_MIRROR_MODE] = player.config[MENU_TYPE_MIRROR_MODE].options;
        this.setKeyHandler('r', () => {
            if (player[MENU_TYPE_MIRROR_MODE] === MIRROR_MODE_OFF) {
                this.setMirrorMode(MIRROR_MODE_ON);
            } else {
                this.setMirrorMode(MIRROR_MODE_OFF);
            }
        });

        this.setKeyHandler(',', repeat => {
            if (!repeat) {
                this.stepBackward();
            }
        });

        this.setKeyHandler('.', repeat => {
            if (!repeat) {
                this.stepForward();
            }
        });

        player.on('play', () => {
            this.disableStepMode();
        });
    }

    enableStepMode() {
        this.player.pause();
        const playButton = this.player.elements.buttons.play[0];
        playButton.classList.add("plyr__oti__hidden");
    }

    disableStepMode() {
        const playButton = this.player.elements.buttons.play[0];
        playButton.classList.remove("plyr__oti__hidden");
    }

    stepForward() {
        this.enableStepMode();
        this.player.forward(this.player.config.frameDuration);
    }

    stepBackward() {
        this.enableStepMode();
        this.player.rewind(this.player.config.frameDuration);
    }

    onMediaChanged() {
        let value = this.player.storage.get(MENU_TYPE_MIRROR_MODE);
        this.setMirrorMode(value);
    }
    
    createCustomButtons(self, control, container, createButton, defaultAttributes) {
        if (control === 'step-backward') {
            container.appendChild(createButton.call(self, 'step-backward', defaultAttributes));
        } else if (control === 'step-forward') {
            container.appendChild(createButton.call(self, 'step-forward', defaultAttributes));
        }
    }

    onKeyPressed(key, repeat) {
        if (this.keyHandler[key]) {
            this.keyHandler[key].call(null, repeat);
        }
    }

    setKeyHandler(key, callback) {
        this.keyHandler[key] = callback;
    }

    bindListeners(self, elements) {
        this.bindClickHandler(self, elements.buttons.stepBackward, ',');
        this.bindClickHandler(self, elements.buttons.stepForward, '.');
    }

    bindClickHandler(self, control, key) {
        self.bind(control, 'click', () => this.onKeyPressed(key, false), key);
    }

    setMirrorMenu(self, controls) {
        // Menu required
        if (!is.element(self.elements.settings.panels[MENU_TYPE_MIRROR_MODE])) {
            return;
        }

        const list = self.elements.settings.panels[MENU_TYPE_MIRROR_MODE].querySelector('[role="menu"]');

        // Toggle the pane and tab
        const toggle = !is.empty(self.options[MENU_TYPE_MIRROR_MODE]) && self.options[MENU_TYPE_MIRROR_MODE].length > 1;
        controls.toggleMenuButton.call(self, MENU_TYPE_MIRROR_MODE, toggle);

        // Empty the menu
        emptyElement(list);

        // Check if we need to toggle the parent
        controls.checkMenu.call(self);

        // If we're hiding, nothing more to do
        if (!toggle) {
            return;
        }

        // Create items
        self.options[MENU_TYPE_MIRROR_MODE].forEach((value) => {
            controls.createMenuItem.call(self, {
                value: value,
                list,
                type: MENU_TYPE_MIRROR_MODE,
                title: this.getLabel(MENU_TYPE_MIRROR_MODE, value),
            });
        });

        controls.updateSetting.call(self, MENU_TYPE_MIRROR_MODE, list);
    }

    getLabel(setting, value) {
        if (setting === MENU_TYPE_MIRROR_MODE) {
            return i18n.get(`${MENU_TYPE_MIRROR_MODE}Label${value}`, this.player.config);
        } else {
            return null;
        }
    }

    onMenuItemChanged(type, value) {
        if (type === MENU_TYPE_MIRROR_MODE) {
            this.setMirrorMode(value);
        }
    }

    setMirrorMode(value) {
        const player = this.player;
        if (!player.config[MENU_TYPE_MIRROR_MODE].options.includes(value)) {
            value = player.config[MENU_TYPE_MIRROR_MODE].default;
        }

        player[MENU_TYPE_MIRROR_MODE] = value;
        player.config[MENU_TYPE_MIRROR_MODE].selected = value;

        this.controls.updateSetting.call(player, MENU_TYPE_MIRROR_MODE);
        player.storage.set({
            [MENU_TYPE_MIRROR_MODE]: value
        });

        const style = player.elements.wrapper.style;
        if (value === MIRROR_MODE_ON) {
            style.transform = "scale(-1, 1)";
        } else {
            style.transform = "";
        }
    }
}

const oti = {
    setup(player, controls) {
        return new OtiPlugin(player, controls);
    },
}

export default oti;