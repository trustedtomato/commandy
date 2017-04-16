"use strict";
/*
Definitions for understanding the code

Program: Can have commands or be used with argvuments
Command: Holds namespace for other Program
Argvument: Option & argument
Option: --option, -o
Argument: Argvument which is not option; this defines the main usage of the command

Program definer: The persion who uses this library
Program user: The persion who uses what uses this library
*/
Object.defineProperty(exports, "__esModule", { value: true });
/*--- helper functions ---*/
const deepEqual = (obj1, obj2) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
};
/*--- for parsing program definer's input */
var ArgumentTypes;
(function (ArgumentTypes) {
    ArgumentTypes[ArgumentTypes["required"] = 0] = "required";
    ArgumentTypes[ArgumentTypes["optional"] = 1] = "optional";
})(ArgumentTypes = exports.ArgumentTypes || (exports.ArgumentTypes = {}));
const requiredArgRegex = /^\<([a-z0-9-_]+)\>$/i;
const optionalArgRegex = /^\[([a-z0-9-_]+)\]$/i;
const parseArgSyntax = (argSyntax) => {
    const args = argSyntax.split(/\s+/g).filter(arg => arg !== '');
    return args.map(arg => {
        const requiredArgMatch = arg.match(requiredArgRegex);
        const optionalArgMatch = arg.match(optionalArgRegex);
        if (requiredArgMatch)
            return { type: ArgumentTypes.required, name: requiredArgMatch[1] };
        if (optionalArgMatch)
            return { type: ArgumentTypes.optional, name: optionalArgMatch[1] };
        throw new Error('Invalid argument: ' + arg);
    });
};
var OptionAppearanceTypes;
(function (OptionAppearanceTypes) {
    OptionAppearanceTypes[OptionAppearanceTypes["long"] = 0] = "long";
    OptionAppearanceTypes[OptionAppearanceTypes["short"] = 1] = "short";
})(OptionAppearanceTypes = exports.OptionAppearanceTypes || (exports.OptionAppearanceTypes = {}));
const optionRegex = /^(?:(?:-([a-z0-9_]))|(?:--([a-z0-9-_]+)))$/i;
const parseOption = ((option) => {
    const optionMatch = option.match(optionRegex);
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
const parseOptionSyntax = (optionSyntax) => {
    const options = optionSyntax.trim().split(/[,\s]+/g);
    try {
        const argument = parseArgSyntax(options[options.length - 1])[0];
        const appearances = options.slice(0, -1).map(option => parseOption(option));
        return { argument, appearances };
    }
    catch (err) {
        const appearances = options.map(option => parseOption(option));
        return { appearances, argument: null };
    }
};
/*--- define Option ---*/
class Option {
    constructor(fullSyntax, descriptionOrCanBeLonely, canBeLonely) {
        this.canBeLonely = false;
        Object.assign(this, parseOptionSyntax(fullSyntax));
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
exports.createOption = (fullSyntax, descriptionOrCanBeLonely, canBeLonely) => {
    return new Option(fullSyntax, descriptionOrCanBeLonely, canBeLonely);
};
/*--- define error & warning types (which may occur while parsing the program user's input) ---*/
class ParsingError {
}
exports.ParsingError = ParsingError;
var ParsingErrors;
(function (ParsingErrors) {
    class ShortOptionWithValueCannotBeCombined extends ParsingError {
        constructor(plainCombinedOptions, wrongOption) {
            super();
            this.plainCombinedOptions = plainCombinedOptions;
            this.wrongOption = wrongOption;
        }
    }
    ParsingErrors.ShortOptionWithValueCannotBeCombined = ShortOptionWithValueCannotBeCombined;
    class MissingArguments extends ParsingError {
        constructor(requiredArgs, givenArgs) {
            super();
            this.requiredArgs = requiredArgs;
            this.givenArgs = givenArgs;
        }
    }
    ParsingErrors.MissingArguments = MissingArguments;
    class MissingOptionValue extends ParsingError {
        constructor(plainOption, option) {
            super();
            this.rawOption = plainOption;
            this.option = option;
        }
    }
    ParsingErrors.MissingOptionValue = MissingOptionValue;
})(ParsingErrors = exports.ParsingErrors || (exports.ParsingErrors = {}));
class ParsingWarning {
}
exports.ParsingWarning = ParsingWarning;
var ParsingWarnings;
(function (ParsingWarnings) {
    class InvalidOption extends ParsingWarning {
        constructor(rawOption) {
            super();
            this.rawOption = rawOption;
        }
    }
    ParsingWarnings.InvalidOption = InvalidOption;
})(ParsingWarnings = exports.ParsingWarnings || (exports.ParsingWarnings = {}));
/*--- define Program ---*/
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
        const _arguments = parseArgSyntax(syntax);
        this._arguments = _arguments;
        return this;
    }
    option(appearancesOrOption, descriptionOrCanBeLonely, canBeLonely) {
        if (typeof appearancesOrOption === 'string') {
            this._options.push(new Option(appearancesOrOption, descriptionOrCanBeLonely, canBeLonely));
        }
        else if (appearancesOrOption instanceof Option) {
            this._options.push(appearancesOrOption);
        }
        return this;
    }
    command(cmd, program) {
        this._commands.set(cmd, program);
        return this;
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
        const errors = [];
        const warnings = [];
        const options = {};
        const args = [];
        let canBeLonely = false;
        argvLoop: for (let i = 0; i < argvs.length; i++) {
            if (argvs[i].startsWith('-')) {
                let plainOption = argvs[i];
                let answer;
                if (plainOption.includes('=')) {
                    const splittedOption = plainOption.split('=');
                    plainOption = splittedOption[0];
                    answer = splittedOption.slice(1).join('=');
                }
                if (!plainOption.startsWith('--') && plainOption.length > 2) {
                    const aoptions = plainOption.replace('-', '').split('').map(option => '-' + option);
                    for (let option of aoptions) {
                        const parsedOption = parseOption(option);
                        const _option = this._options.find(_option => _option.appearances.some(appearance => deepEqual(parsedOption, appearance)));
                        if (typeof _option === 'undefined') {
                            warnings.push(new ParsingWarnings.InvalidOption(option));
                            continue argvLoop;
                        }
                        if (_option.canBeLonely) {
                            canBeLonely = true;
                        }
                        if (_option.argument !== null && _option.argument.type === ArgumentTypes.required) {
                            errors.push(new ParsingErrors.ShortOptionWithValueCannotBeCombined(plainOption, _option));
                        }
                        _option.appearances
                            .filter(appearance => appearance.type === OptionAppearanceTypes.long)
                            .forEach(appearance => {
                            options[appearance.text] = true;
                        });
                    }
                    ;
                }
                else {
                    const parsedOption = parseOption(plainOption);
                    const _option = this._options.find(_option => _option.appearances.some(appearance => deepEqual(parsedOption, appearance)));
                    if (typeof _option === 'undefined') {
                        warnings.push(new ParsingWarnings.InvalidOption(plainOption));
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
                                errors.push(new ParsingErrors.MissingOptionValue(plainOption, _option));
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
        let requiredArgs = this._arguments.filter((_arg) => _arg.type === ArgumentTypes.required);
        if (!canBeLonely && requiredArgs.length > args.length) {
            errors.push(new ParsingErrors.MissingArguments(requiredArgs.map(requiredArg => requiredArg.name), args));
        }
        let numberOfFillableOptionalArgs = args.length - requiredArgs.length;
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
            options: options,
            program: this,
            errors,
            warnings
        };
    }
}
exports.Program = Program;
exports.createProgram = (syntax) => {
    return new Program(syntax);
};
