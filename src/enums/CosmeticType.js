class CosmeticType {
    static TYPES = {
        CHARACTER: {
            value: 'outfit',
            backendValue: 'AthenaCharacter'
        },
        EMOTE: {
            value: 'emote',
            backendValue: 'AthenaDance'
        },
        WRAP: {
            value: 'wrap',
            backendValue: 'AthenaItemWrap'
        },
        EMOJI: {
            value: 'emoji',
            backendValue: 'AthenaEmoji'
        },
        GLIDER: {
            value: 'glider',
            backendValue: 'AthenaGlider'
        },
        SPRAY: {
            value: 'spray',
            backendValue: 'AthenaSpray'
        },
        LOADINGSCREEN: {
            value: 'loadingscreen',
            backendValue: 'AthenaLoadingScreen'
        },
        CONTRAIL: {
            value: 'contrail',
            backendValue: 'AthenaSkyDiveContrail'
        },
        SHOES: {
            value: 'shoe',
            backendValue: 'CosmeticShoes'
        },
        PICKAXE: {
            value: 'pickaxe',
            backendValue: 'AthenaPickaxe'
        },
        BACKPACK: {
            value: 'backpack',
            backendValue: 'AthenaBackpack'
        },
        VEHICLES_SKIN: {
            value: 'skin',
            backendValue: 'VehicleCosmetics_Skin'
        },
        MUSICPACK: {
            value: 'music',
            backendValue: 'AthenaMusicPack'
        },
        VEHICLES_WHEEL: {
            value: 'wheel',
            backendValue: 'VehicleCosmetics_Wheel'
        },
        JUNOBUILDINGPROP: {
            value: 'decor bundle',
            backendValue: 'JunoBuildingProp'
        },
        VEHICLES_BOOSTER: {
            value: 'turbo',
            backendValue: 'VehicleCosmetics_Booster'
        },
        JUNOBUILDINGSET: {
            value: 'build',
            backendValue: 'JunoBuildingSet'
        },
        VEHICLES_DRIFTTRAIL: {
            value: 'trail',
            backendValue: 'VehicleCosmetics_DriftTrail'
        },
        SPARKSGUITAR: {
            value: 'guitar',
            backendValue: 'SparksGuitar'
        },
        VEHICLES_BODY: {
            value: 'body',
            backendValue: 'VehicleCosmetics_Body'
        },
        SPARKSBASS: {
            value: 'bass',
            backendValue: 'SparksBass'
        },
        SPARKSDRUM: {
            value: 'drums',
            backendValue: 'SparksDrum'
        },
        SPARKSMIC: {
            value: 'microphone',
            backendValue: 'SparksMic'
        },
        SPARKSKEYBOARD: {
            value: 'keytar',
            backendValue: 'SparksKeyboard'
        },
        SPARKSAURA: {
            value: 'aura',
            backendValue: 'SparksAura'
        },
        TOY: {
            value: 'toy',
            backendValue: 'AthenaToy'
        },
        PETCARRIER: {
            value: 'pet',
            backendValue: 'AthenaPetCarrier'
        },
        PET: {
            value: 'pet',
            backendValue: 'AthenaPet'
        },
        SIDEKICK: {
            value: 'sidekick',
            backendValue: 'CosmeticCompanion'
        }
    };

    static outfit() {
        return this.TYPES.CHARACTER.value;
    }

    static character() {
        return this.TYPES.CHARACTER.value;
    }

    static emote() {
        return this.TYPES.EMOTE.value;
    }

    static dance() {
        return this.TYPES.EMOTE.value;
    }

    static wrap() {
        return this.TYPES.WRAP.value;
    }
    
    static emoji() {
        return this.TYPES.EMOJI.value;
    }

    static glider() {
        return this.TYPES.GLIDER.value;
    }

    static spray() {
        return this.TYPES.SPRAY.value;
    }

    static loadingscreen() {
        return this.TYPES.LOADINGSCREEN.value;
    }

    static contrail() {
        return this.TYPES.CONTRAIL.value;
    }

    static shoes() {
        return this.TYPES.SHOES.value;
    }

    static pickaxe() {
        return this.TYPES.PICKAXE.value;
    }

    static sidekick() {
        return this.TYPES.SIDEKICK.value;
    }

    static backpack() {
        return this.TYPES.BACKPACK.value;
    }
    
    static vehicleskin() {
        return this.TYPES.VEHICLES_SKIN.value;
    }

    static musicpack() {
        return this.TYPES.MUSICPACK.value;
    }

    static vehiclewheel() {
        return this.TYPES.VEHICLES_WHEEL.value;
    }

    static junobuildingprop() {
        return this.TYPES.JUNOBUILDINGPROP.value;
    }

    static vehiclebooster() {
        return this.TYPES.VEHICLES_BOOSTER.value;
    }

    static junobuildingset() {
        return this.TYPES.JUNOBUILDINGSET.value;
    }

    static vehicledrifttrail() {
        return this.TYPES.VEHICLES_DRIFTTRAIL.value;
    }

    static sparksguitar() {
        return this.TYPES.SPARKSGUITAR.value;
    }

    static vehiclebody() {
        return this.TYPES.VEHICLES_BODY.value;
    }

    static sparksbass() {
        return this.TYPES.SPARKSBASS.value;
    }

    static sparksdrum() {
        return this.TYPES.SPARKSDRUM.value;
    }

    static sparksmic() {
        return this.TYPES.SPARKSMIC.value;
    }

    static sparkskeyboard() {
        return this.TYPES.SPARKSKEYBOARD.value;
    }

    static sparksaura() {
        return this.TYPES.SPARKSAURA.value;
    }

    static toy() {
        return this.TYPES.TOY.value;
    }

    static petcarrier() {
        return this.TYPES.PETCARRIER.value;
    }

    static pet() {
        return this.TYPES.PET.value;
    }

    static getBackendValue(type) {
        const found = Object.values(this.TYPES).find(t => t.value === type);
        return found ? found.backendValue : null;
    }

    static isValid(type) {
        return Object.values(this.TYPES).some(t => t.value === type);
    }

    static getAll() {
        return Object.values(this.TYPES).map(t => t.value);
    }
}

export default CosmeticType;
