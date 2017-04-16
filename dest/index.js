/*
Program: Can have commands or be used with argvuments
Command: Holds namespace for other Program
Argvument: Option & argument
Option: --option, -o
Argument: Argvument which is not option; this defines the main usage of the command
*/
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deepEqual = (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
};
var ArgumentTypes;
(function (ArgumentTypes) {
    ArgumentTypes[ArgumentTypes["required"] = 0] = "required";
    ArgumentTypes[ArgumentTypes["optional"] = 1] = "optional";
})(ArgumentTypes = exports.ArgumentTypes || (exports.ArgumentTypes = {}));
exports.requiredArgRegex = /^\<([a-z0-9-_]+)\>$/i;
exports.optionalArgRegex = /^\[([a-z0-9-_]+)\]$/i;
exports.parseArgSyntax = (argSyntax) => {
    const args = argSyntax.split(/\s+/g).filter(arg => arg !== '');
    return args.map(arg => {
        const requiredArgMatch = arg.match(exports.requiredArgRegex);
        const optionalArgMatch = arg.match(exports.optionalArgRegex);
        if (requiredArgMatch)
            return { type: ArgumentTypes.required, name: requiredArgMatch[1] };
        if (optionalArgMatch)
            return { type: ArgumentTypes.optional, name: optionalArgMatch[1] };
        throw new Error('Invalid argument: ' + arg);
    });
};
/** The first bracket is the command, the second one is the argument syntax (which is optional) */
exports.commandRegex = /^([a-z0-9-_]+)(?:\s+(.*))?$/i;
var OptionAppearanceTypes;
(function (OptionAppearanceTypes) {
    OptionAppearanceTypes[OptionAppearanceTypes["long"] = 0] = "long";
    OptionAppearanceTypes[OptionAppearanceTypes["short"] = 1] = "short";
})(OptionAppearanceTypes = exports.OptionAppearanceTypes || (exports.OptionAppearanceTypes = {}));
exports.optionRegex = /^(?:(?:-([a-z0-9_]))|(?:--([a-z0-9-_]+)))$/i;
exports.parseOption = ((option) => {
    const optionMatch = option.match(exports.optionRegex);
    if (!optionMatch) {
        throw new Error('Invalid option: ' + option);
    }
    if (typeof optionMatch[1] === 'string') {
        return {
            type: OptionAppearanceTypes.short,
            text: optionMatch[1]
        };
    }
    else {
        return {
            type: OptionAppearanceTypes.long,
            text: optionMatch[2]
        };
    }
});
exports.parseOptionSyntax = (optionSyntax) => {
    const options = optionSyntax.trim().split(/[,\s]+/g);
    try {
        const argument = exports.parseArgSyntax(options[options.length - 1])[0];
        const appearances = options.slice(0, -1).map(option => exports.parseOption(option));
        return { argument, appearances };
    }
    catch (err) {
        const appearances = options.map(option => exports.parseOption(option));
        return { appearances, argument: null };
    }
};
class Option {
    constructor(fullSyntax, descriptionOrCanBeLonely, canBeLonely) {
        this.canBeLonely = false;
        Object.assign(this, exports.parseOptionSyntax(fullSyntax));
        if (typeof descriptionOrCanBeLonely === 'string') {
            this.description = descriptionOrCanBeLonely;
        }
        else {
            if (typeof canBeLonely !== 'undefined') {
                throw new Error('Cannot define two options!');
            }
            canBeLonely = descriptionOrCanBeLonely;
        }
        if (typeof canBeLonely === 'boolean') {
            this.canBeLonely = canBeLonely;
        }
    }
}
exports.Option = Option;
class Program {
    constructor(syntax = '') {
        this._description = '';
        this._commands = new Map();
        this._options = [];
        this.arguments(syntax);
    }
    description(description) {
        this._description = description;
        return this;
    }
    arguments(syntax) {
        const _arguments = exports.parseArgSyntax(syntax);
        this._arguments = _arguments;
    }
    option(appearances, descriptionOrCanBeLonely, canBeLonely) {
        this._options.push(new Option(appearances, descriptionOrCanBeLonely, canBeLonely));
        return this;
    }
    command(fullSyntax) {
        const commandMatch = fullSyntax.trim().match(exports.commandRegex);
        if (!commandMatch) {
            throw new Error('Invalid command syntax!');
        }
        const commandName = commandMatch[1];
        const command = new Program(commandMatch[2] || '');
        this._commands.set(commandName, command);
        return command;
    }
    parse(argvs) {
        const firstArgumentIndex = argvs.findIndex(argv => !argv.startsWith('-'));
        if (firstArgumentIndex >= 0) {
            const firstArgument = argvs[firstArgumentIndex];
            const matchingCommand = this._commands.get(firstArgument);
            if (matchingCommand) {
                argvs.splice(firstArgumentIndex, 1);
                const parsed = matchingCommand.parse(argvs);
                return Object.assign(parsed, { commandChain: (firstArgument + ' ' + parsed.commandChain).trim() });
            }
        }
        const options = {};
        const args = [];
        let canBeLonely = false;
        for (let i = 0; i < argvs.length; i++) {
            if (argvs[i].startsWith('-')) {
                let option = argvs[i];
                let answer;
                if (option.includes('=')) {
                    const splittedOption = option.split('=');
                    option = splittedOption[0];
                    answer = splittedOption.slice(1).join('=');
                }
                if (!option.startsWith('--') && option.length > 2) {
                    option.replace('-', '').split('').map(option => '-' + option).forEach(option => {
                        const parsedOption = exports.parseOption(option);
                        const _option = this._options.find(_option => _option.appearances.some(appearance => deepEqual(parsedOption, appearance)));
                        if (typeof _option === 'undefined') {
                            throw new Error('-' + option + ' is not a valid option!');
                        }
                        if (_option.canBeLonely) {
                            canBeLonely = true;
                        }
                        if (_option.argument !== null && _option.argument.type === ArgumentTypes.required) {
                            throw new Error('-' + option + ' should have a value!');
                        }
                        _option.appearances
                            .filter(appearance => appearance.type === OptionAppearanceTypes.long)
                            .forEach(appearance => {
                            options[appearance.text] = true;
                        });
                    });
                }
                else {
                    const parsedOption = exports.parseOption(option);
                    const _option = this._options.find(_option => _option.appearances.some(appearance => deepEqual(parsedOption, appearance)));
                    if (typeof _option === 'undefined') {
                        throw new Error(option + ' is not a valid option!');
                    }
                    if (_option.canBeLonely) {
                        canBeLonely = true;
                    }
                    if (_option.argument === null) {
                        answer = true;
                    }
                    else if (typeof answer === 'undefined') {
                        if (_option.argument.type === ArgumentTypes.required) {
                            if (typeof argvs[i + 1] === 'undefined') {
                                throw new Error(option + ' should have a value!');
                            }
                            answer = argvs[i + 1];
                            i++;
                        }
                    }
                    _option.appearances
                        .filter(appearance => appearance.type === OptionAppearanceTypes.long)
                        .forEach(appearance => {
                        options[appearance.text] = answer;
                    });
                }
            }
            else {
                args.push(argvs[i]);
            }
        }
        let numberOfRequiredArgs = this._arguments.reduce((n, _arg) => {
            if (_arg.type === ArgumentTypes.required) {
                n++;
            }
            return n;
        }, 0);
        if (!canBeLonely && numberOfRequiredArgs > args.length) {
            throw new Error('Missing arguments! The amount of them: ' + (numberOfRequiredArgs - args.length));
        }
        let numberOfFillableOptionalArgs = args.length - numberOfRequiredArgs;
        const argumentObject = {};
        let argI = 0;
        argLoop: for (let arg of this._arguments) {
            if (typeof args[argI] === 'undefined')
                break argLoop;
            if (arg.type === ArgumentTypes.optional) {
                if (numberOfFillableOptionalArgs <= 0) {
                    continue;
                }
                else {
                    numberOfFillableOptionalArgs--;
                }
            }
            argumentObject[arg.name] = args[argI];
            argI++;
        }
        return {
            commandChain: '',
            arguments: argumentObject,
            options: options
        };
    }
}
exports.Program = Program;
exports.program = new Program();
