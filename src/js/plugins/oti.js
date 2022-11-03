import defaults from '../config/defaults';
import { emptyElement } from '../utils/elements';
import i18n from '../utils/i18n';
import is from '../utils/is';
import { extend } from '../utils/objects';

const MENU_TYPE_MIRROR_MODE = 'mirror';
const MENU_TYPE_IOS_NATIVE_MODE = 'iosNative';
const MIRROR_MODE_OFF = 0;
const MIRROR_MODE_ON = 1;
const MIRROR_MODE_VALUES = [MIRROR_MODE_OFF, MIRROR_MODE_ON];
const IOS_NATIVE_OFF = 0;
const IOS_NATIVE_ON = 1;
const IOS_NATIVE_VALUES = [IOS_NATIVE_OFF, IOS_NATIVE_ON];

extend(defaults, {
    frameDuration: 1 / 30, // approximation - getting the real framerate is hard
    [MENU_TYPE_MIRROR_MODE]: {
        default: MIRROR_MODE_OFF,
        selected: MIRROR_MODE_OFF,
        options: MIRROR_MODE_VALUES
    },
    [MENU_TYPE_IOS_NATIVE_MODE]: {
        default: IOS_NATIVE_OFF,
        selected: IOS_NATIVE_OFF,
        options: IOS_NATIVE_VALUES
    },
    i18n: {
        [MENU_TYPE_MIRROR_MODE]: "Mirror",
        [`${MENU_TYPE_MIRROR_MODE}Label${MIRROR_MODE_OFF}`]: "Off",
        [`${MENU_TYPE_MIRROR_MODE}Label${MIRROR_MODE_ON}`]: "On",
        [MENU_TYPE_IOS_NATIVE_MODE]: "Native Fullscreen",
        [`${MENU_TYPE_IOS_NATIVE_MODE}Label${IOS_NATIVE_OFF}`]: "Off",
        [`${MENU_TYPE_IOS_NATIVE_MODE}Label${IOS_NATIVE_ON}`]: "On",
    }
});

const IS_IOS_APP = navigator.userAgent.startsWith("OTI_ios_app");
const IS_ANDROID_APP = navigator.userAgent.startsWith("OTI_android_app");

const EMBEDDED_CLASS = "plyr__oti--embedded";
const FULLSCREEN_CLASS = "plyr__oti--fullscreen";
const IOS_CLASS = "plyr__oti--ios";
const ANDROID_CLASS = "plyr__oti--android";
const LANDSCAPE_CLASS = "plyr__oti--landscape";

class OtiPlugin {

    keyHandler = {};

    constructor(player, controls) {
        this.player = player;
        this.controls = controls;
        player.options[MENU_TYPE_MIRROR_MODE] = player.config[MENU_TYPE_MIRROR_MODE].options;
        player.options[MENU_TYPE_IOS_NATIVE_MODE] = player.config[MENU_TYPE_IOS_NATIVE_MODE].options;
    }

    initialize() {
        const player = this.player;

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

        this.setKeyHandler('+', repeat => {
            if (!repeat) {
                let index = player.config.speed.options.indexOf(player.speed)
                if (index >= 0) {
                    player.speed = player.config.speed.options[index + 1] || player.speed;
                }
            }
        });

        this.setKeyHandler('-', repeat => {
            if (!repeat) {
                let index = player.config.speed.options.indexOf(player.speed)
                if (index >= 0) {
                    player.speed = player.config.speed.options[index - 1] || player.speed;
                }
            }
        });

        this.setKeyHandler('n', repeat => {
            if (!repeat) {
                player.speed = 1;
            }
        });

        const classList = player.elements.container.classList;
        setTimeout(() => { // needs to be deferred or it won't work
            classList.add(EMBEDDED_CLASS);
            if (IS_IOS_APP) {
                classList.add(IOS_CLASS);
            } else if (IS_ANDROID_APP) {
                classList.add(ANDROID_CLASS);
            }
        }, 0);

        player.on('enterfullscreen', () => {
            classList.add(FULLSCREEN_CLASS);
            classList.remove(EMBEDDED_CLASS);
            this.isFullscreen = true;
            this.updateLandscapeMode();
        });

        player.on('exitfullscreen', () => {
            const classList = player.elements.container.classList;
            classList.remove(FULLSCREEN_CLASS);
            classList.add(EMBEDDED_CLASS);
            this.isFullscreen = false;
            this.updateLandscapeMode();
        })

        window.addEventListener('resize', () => {
            this.updateLandscapeMode();
        });
    }

    updateLandscapeMode() {
        const classList = this.player.elements.container.classList;
        if (this.isFullscreen) {
            if (window.innerWidth < window.innerHeight) {
                classList.add(LANDSCAPE_CLASS);
            } else {
                classList.remove(LANDSCAPE_CLASS);
            }
        } else {
            classList.remove(LANDSCAPE_CLASS);
        }
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
        this.setMirrorMode(this.player.storage.get(MENU_TYPE_MIRROR_MODE));
        if (IS_IOS_APP) {
            this.setIOSNativeMode(this.player.storage.get(MENU_TYPE_IOS_NATIVE_MODE));
        }
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

    setMenu(self, controls, menuType) {
        // Menu required
        if (!is.element(self.elements.settings.panels[menuType])) {
            return;
        }

        const list = self.elements.settings.panels[menuType].querySelector('[role="menu"]');

        // Toggle the pane and tab
        const toggle = !is.empty(self.options[menuType]) && self.options[menuType].length > 1;
        controls.toggleMenuButton.call(self, menuType, toggle);

        // Empty the menu
        emptyElement(list);

        // Check if we need to toggle the parent
        controls.checkMenu.call(self);

        // If we're hiding, nothing more to do
        if (!toggle) {
            return;
        }

        // Create items
        self.options[menuType].forEach((value) => {
            controls.createMenuItem.call(self, {
                value: value,
                list,
                type: menuType,
                title: this.getLabel(menuType, value),
            });
        });

        controls.updateSetting.call(self, menuType, list);
    }

    setOTIMenus(self, controls) {
        this.setMenu(self, controls, MENU_TYPE_MIRROR_MODE);
        if (IS_IOS_APP) {
            this.setMenu(self, controls, MENU_TYPE_IOS_NATIVE_MODE);
        }
    }

    getLabel(setting, value) {
        if (setting === MENU_TYPE_MIRROR_MODE) {
            return i18n.get(`${MENU_TYPE_MIRROR_MODE}Label${value}`, this.player.config);
        } else if (setting === MENU_TYPE_IOS_NATIVE_MODE) {
            return i18n.get(`${MENU_TYPE_IOS_NATIVE_MODE}Label${value}`, this.player.config);
        } else {
            return null;
        }
    }

    onMenuItemChanged(type, value) {
        if (type === MENU_TYPE_MIRROR_MODE) {
            this.setMirrorMode(value);
        } else if (type === MENU_TYPE_IOS_NATIVE_MODE) {
            this.setIOSNativeMode(value);
        }
    }

    setSettingValue(menuType, value) {
        const player = this.player;
        if (!player.config[menuType].options.includes(value)) {
            value = player.config[menuType].default;
        }

        player[menuType] = value;
        player.config[menuType].selected = value;

        this.controls.updateSetting.call(player, menuType);
        player.storage.set({
            [menuType]: value
        });
    }

    setMirrorMode(value) {
        this.setSettingValue(MENU_TYPE_MIRROR_MODE, value);

        const player = this.player;
        const classList = player.elements.wrapper.classList;
        if (value === MIRROR_MODE_ON) {
            classList.add("plyr__oti--mirrored");
        } else {
            classList.remove("plyr__oti--mirrored");
        }
    }

    setIOSNativeMode(value) {
        this.setSettingValue(MENU_TYPE_IOS_NATIVE_MODE, value);

        const player = this.player;
        if (value === IOS_NATIVE_ON) {
            player.config.fullscreen.iosNative = true;
        } else {
            player.config.fullscreen.iosNative = false;
        }
    }
}

const oti = {
    setup(player, controls) {
        return new OtiPlugin(player, controls);
    },
}

export default oti;