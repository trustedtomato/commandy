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



/*--- helper functions ---*/
const deepEqual = (obj1:{[key: string]:any},obj2:{[key: string]:any}):boolean => {
	return JSON.stringify(obj1) === JSON.stringify(obj2);
};



/*--- for parsing program definer's input */
export enum ArgumentTypes{
	required,
	optional
}
export interface Argument{
	type:ArgumentTypes
	name:string
}

const requiredArgRegex = /^\<([a-z0-9-_]+)\>$/i;
const optionalArgRegex = /^\[([a-z0-9-_]+)\]$/i;
const parseArgSyntax = (argSyntax:string):Argument[] => {
	const args = argSyntax.split(/\s+/g).filter(arg => arg!=='');
	return args.map(arg => {
		const requiredArgMatch = arg.match(requiredArgRegex);
		const optionalArgMatch = arg.match(optionalArgRegex);
		if(requiredArgMatch) return{ type: ArgumentTypes.required, name: requiredArgMatch[1] };
		if(optionalArgMatch) return{ type: ArgumentTypes.optional, name: optionalArgMatch[1] };
		throw new Error('Invalid argument: '+arg);
	});
};


export enum OptionAppearanceTypes{
	long,
	short
}
export interface OptionAppearance{
	text:string
	type:OptionAppearanceTypes
}
export interface BasicOption{
	appearances:OptionAppearance[],
	argument:Argument|null
}
const optionRegex = /^(?:(?:-([a-z0-9_]))|(?:--([a-z0-9-_]+)))$/i;
const parseOption = ((option:string) => {
	const optionMatch = option.match(optionRegex);
	if(!optionMatch){
		throw new Error('Invalid option: '+option);
	}
	if(typeof optionMatch[1] === 'string'){
		return{
			type: OptionAppearanceTypes.short,
			text: optionMatch[1]
		};
	}else{
		return{
			type: OptionAppearanceTypes.long,
			text: optionMatch[2]
		};
	}
});
const parseOptionSyntax = (optionSyntax:string):BasicOption => {
	const options = optionSyntax.trim().split(/[,\s]+/g);
	try{
		const argument = parseArgSyntax(options[options.length-1])[0];
		const appearances:OptionAppearance[] = options.slice(0,-1).map(option => parseOption(option));
		return{argument,appearances};
	}catch(err){
		const appearances:OptionAppearance[] = options.map(option => parseOption(option));
		return{appearances,argument: null};
	}
};



/*--- define Option ---*/
export class Option{
	appearances:OptionAppearance[]
	argument:Argument|null
	description?:string
	canBeLonely:boolean = false
	constructor(fullSyntax:string,descriptionOrCanBeLonely?:string|boolean,canBeLonely?:boolean){
		Object.assign(this,parseOptionSyntax(fullSyntax));
		if(typeof descriptionOrCanBeLonely === 'string'){
			this.description = descriptionOrCanBeLonely;
		}else{
			if(typeof canBeLonely !== 'undefined'){
				throw new Error('Cannot define two options!');
			}
			canBeLonely = descriptionOrCanBeLonely;
		}
		if(typeof canBeLonely === 'boolean'){
			this.canBeLonely = canBeLonely;
		}
	}
}
export const createOption = (fullSyntax:string,descriptionOrCanBeLonely?:string|boolean,canBeLonely?:boolean) => {
	return new Option(fullSyntax,descriptionOrCanBeLonely,canBeLonely);
};



/*--- define error & warning types (which may occur while parsing the program user's input) ---*/
export class ParsingError{}
export namespace ParsingErrors{
	export class ShortOptionWithValueCannotBeCombined extends ParsingError{
		plainCombinedOptions:string
		wrongOption:Option
		constructor(plainCombinedOptions:string,wrongOption:Option){
			super();
			this.plainCombinedOptions = plainCombinedOptions;
			this.wrongOption = wrongOption;
		}
	}
	export class MissingArguments extends ParsingError{
		readonly requiredArgs:string[]
		readonly givenArgs:string[]
		constructor(requiredArgs:string[],givenArgs:string[]){
			super();
			this.requiredArgs = requiredArgs;
			this.givenArgs = givenArgs;
		}
	}
	export class MissingOptionValue extends ParsingError{
		readonly rawOption:string
		readonly option:Option
		constructor(plainOption:string,option:Option){
			super();
			this.rawOption = plainOption;
			this.option = option;
		}
	}
}

export class ParsingWarning{}
export namespace ParsingWarnings{
	export class InvalidOption extends ParsingWarning{
		readonly rawOption:string
		constructor(rawOption:string){
			super();
			this.rawOption = rawOption;
		}
	}
}



/*--- define how will the parsed object (result) look like ---*/
export interface Result{
	commandChain:string
	program:Program
	options:{
		[option: string]:string|boolean
	}
	arguments:{
		[property: string]:string
	}
	errors:ParsingError[]
	warnings:ParsingWarning[]
}



/*--- define Program ---*/
export class Program{
	private _arguments:Argument[]
	private _description:string = ''
	private _commands:Map<string,Program> = new Map()
	private _options:Option[] = []
	description(description:string):this{
		this._description = description;
		return this;
	}
	arguments(syntax:string):this{
		const _arguments = parseArgSyntax(syntax);
		this._arguments = _arguments;
		return this;
	}
	option(appearancesOrOption:string|Option,descriptionOrCanBeLonely?:string,canBeLonely?:boolean):this{
		if(typeof appearancesOrOption === 'string'){
			this._options.push(new Option(appearancesOrOption,descriptionOrCanBeLonely,canBeLonely));
		}else if(appearancesOrOption instanceof Option){
			this._options.push(appearancesOrOption);
		}
		return this;
	}
	command(cmd:string,program:Program):this{
		this._commands.set(cmd,program);
		return this;
	}
	parse(argvs:string[]):Result{
		const firstArgumentIndex = argvs.findIndex(argv => !argv.startsWith('-'));
		if(firstArgumentIndex>=0){
			const firstArgument = argvs[firstArgumentIndex];
			const matchingCommand = this._commands.get(firstArgument);
			if(matchingCommand){
				argvs.splice(firstArgumentIndex,1);
				const parsed = matchingCommand.parse(argvs);
				return Object.assign(parsed,{commandChain: (firstArgument+' '+parsed.commandChain).trim()});
			}
		}

		const errors:ParsingError[] = [];
		const warnings:ParsingWarning[] = [];

		const options:{[option: string]:string|boolean} = {};
		const args:string[] = [];
		let canBeLonely = false;
		for(let i = 0; i < argvs.length; i++){
			if(argvs[i].startsWith('-')){
				let plainOption = argvs[i];
				let answer:string|boolean;
				if(plainOption.includes('=')){
					const splittedOption = plainOption.split('=');
					plainOption = splittedOption[0];
					answer = splittedOption.slice(1).join('=');
				}
				if(!plainOption.startsWith('--') && plainOption.length>2){
					plainOption.replace('-','').split('').map(option => '-'+option).forEach(option => {
						const parsedOption = parseOption(option);
						const _option = this._options.find(_option => 
							_option.appearances.some(appearance =>
								deepEqual(parsedOption,appearance)
							)
						);
						if(typeof _option === 'undefined'){
							warnings.push(new ParsingWarnings.InvalidOption(option));
						}
						if(_option.canBeLonely){
							canBeLonely = true;
						}
						if(_option.argument!==null && _option.argument.type===ArgumentTypes.required){
							errors.push(new ParsingErrors.ShortOptionWithValueCannotBeCombined(plainOption,_option));
						}
						_option.appearances
							.filter(appearance => appearance.type===OptionAppearanceTypes.long)
							.forEach(appearance => {
								options[appearance.text] = true;
							});
					});
				}else{
					const parsedOption = parseOption(plainOption);
					const _option = this._options.find(_option => 
						_option.appearances.some(appearance =>
							deepEqual(parsedOption,appearance)
						)
					);
					if(typeof _option === 'undefined'){
						warnings.push(new ParsingWarnings.InvalidOption(plainOption));
					}
					if(_option.canBeLonely){
						canBeLonely = true;
					}
					if(_option.argument===null){
						answer = true;
					}else if(typeof answer === 'undefined'){
						if(_option.argument.type===ArgumentTypes.required){
							if(typeof argvs[i+1] === 'undefined'){
								errors.push(new ParsingErrors.MissingOptionValue(plainOption,_option));
							}
							answer = argvs[i+1];
							i++;
						}
					}
					_option.appearances
						.filter(appearance => appearance.type===OptionAppearanceTypes.long)
						.forEach(appearance => {
							options[appearance.text] = answer;
						});
				}
			}else{
				args.push(argvs[i]);
			}
		}
		let requiredArgs = this._arguments.filter((_arg) => _arg.type===ArgumentTypes.required);
		if(!canBeLonely && requiredArgs.length > args.length){
			errors.push(new ParsingErrors.MissingArguments(requiredArgs.map(requiredArg => requiredArg.name),args));
		}
		let numberOfFillableOptionalArgs = args.length - requiredArgs.length;
		const argumentObject:any = {};
		let argI = 0;
		argLoop: for(let arg of this._arguments){
			if(typeof args[argI] === 'undefined') break argLoop;
			if(arg.type===ArgumentTypes.optional){
				if(numberOfFillableOptionalArgs<=0){
					continue;
				}else{
					numberOfFillableOptionalArgs--;
				}
			}
			argumentObject[arg.name] = args[argI];
			argI++;
		}
		return{
			commandChain: '',
			arguments: argumentObject,
			options: options,
			program: this,
			errors,
			warnings
		};
	}
	constructor(syntax:string = ''){
		this.arguments(syntax);
	}
}
export const createProgram = (syntax?:string):Program => {
	return new Program(syntax);
};