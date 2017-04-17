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
export type ArgumentTypes = 'required' | 'optional';
export interface Argument{
	type:ArgumentTypes
	name:string
}

const requiredArgRegex = /^\<([a-z0-9-_]+)\>$/i;
const optionalArgRegex = /^\[([a-z0-9-_]+)\]$/i;
const parseArgSyntax = (argSyntax:string):Argument[] => {
	const args = argSyntax.split(/\s+/g).filter(arg => arg!=='');
	return args.map((arg):Argument => {
		const requiredArgMatch = arg.match(requiredArgRegex);
		const optionalArgMatch = arg.match(optionalArgRegex);
		if(requiredArgMatch) return{ type: 'required', name: requiredArgMatch[1] };
		if(optionalArgMatch) return{ type: 'optional', name: optionalArgMatch[1] };
		throw new Error('Invalid argument: '+arg);
	});
};


export type OptionAppearanceTypes = 'long' | 'short';
export interface OptionAppearance{
	text:string
	type:OptionAppearanceTypes
}
export interface BasicOption{
	appearances:OptionAppearance[],
	argument:Argument|null
}
const optionRegex = /^(?:(?:-([a-z0-9_]))|(?:--([a-z0-9-_]+)))$/i;
const parseOption = ((option:string):OptionAppearance => {
	const optionMatch = option.match(optionRegex);
	if(!optionMatch){
		throw new Error('Invalid option: '+option);
	}
	if(typeof optionMatch[1] === 'string'){
		return{
			type: 'short',
			text: optionMatch[1]
		};
	}else{
		return{
			type: 'long',
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
	_appearances:OptionAppearance[]
	_argument:Argument|null
	_description?:string
	_canBeLonely:boolean = false
	constructor(fullSyntax:string,descriptionOrCanBeLonely?:string|boolean,canBeLonely?:boolean){
		Object.assign(this,parseOptionSyntax(fullSyntax));
		if(typeof descriptionOrCanBeLonely === 'string'){
			this._description = descriptionOrCanBeLonely;
		}else{
			if(typeof canBeLonely !== 'undefined'){
				throw new Error('Cannot define two options!');
			}
			canBeLonely = descriptionOrCanBeLonely;
		}
		if(typeof canBeLonely === 'boolean'){
			this._canBeLonely = canBeLonely;
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
	export class TooManyArguments extends ParsingWarning{
		readonly args:Argument[]
		readonly givenArgs:string[]
		constructor(args:Argument[],givenArgs:string[]){
			super();
			this.args = args;
			this.givenArgs = givenArgs;
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

		argvLoop: for(let i = 0; i < argvs.length; i++){
			if(argvs[i].startsWith('-')){
	
				let rawOption = argvs[i];
				let optionValue:string|boolean;

				if(rawOption.includes('=')){
					const splittedOption = rawOption.split('=');
					rawOption = splittedOption[0];
					optionValue = splittedOption.slice(1).join('=');
				}

				if(!rawOption.startsWith('--') && rawOption.length>2){
					const multipleRawOptions = rawOption.replace('-','').split('').map(option => '-'+option);
					for(let singleRawOption of multipleRawOptions){
						const appearance = parseOption(singleRawOption);
						const _option = this._options.find(_option => 
							_option._appearances.some(_appearance =>
								deepEqual(_appearance,appearance)
							)
						);
						if(typeof _option === 'undefined'){
							warnings.push(new ParsingWarnings.InvalidOption(singleRawOption));
							continue argvLoop;
						}
						if(_option._canBeLonely){
							canBeLonely = true;
						}
						if(_option._argument!==null && _option._argument.type==='required'){
							errors.push(new ParsingErrors.ShortOptionWithValueCannotBeCombined(rawOption,_option));
						}
						_option._appearances
							.filter(_appearance => _appearance.type==='long')
							.forEach(_appearance => {
								options[_appearance.text] = true;
							});
					};
				}else{
					const appearance = parseOption(rawOption);
					const _option = this._options.find(_option => 
						_option._appearances.some(_appearance =>
							deepEqual(_appearance,appearance)
						)
					);
					if(typeof _option === 'undefined'){
						warnings.push(new ParsingWarnings.InvalidOption(rawOption));
						continue argvLoop;
					}
					if(_option._canBeLonely){
						canBeLonely = true;
					}
					if(_option._argument===null){
						optionValue = true;
					}else if(typeof optionValue === 'undefined'){
						if(_option._argument.type==='required'){
							if(typeof argvs[i+1] === 'undefined'){
								errors.push(new ParsingErrors.MissingOptionValue(rawOption,_option));
							}
							optionValue = argvs[i+1];
							i++;
						}
					}
					_option._appearances
						.filter(_appearance => _appearance.type==='long')
						.forEach(_appearance => {
							options[_appearance.text] = optionValue;
						});
				}
			}else{
				args.push(argvs[i]);
			}
		}
		if(args.length > this._arguments.length){
			warnings.push(new ParsingWarnings.TooManyArguments(this._arguments,args));
		}
		let _requiredArgs = this._arguments.filter((_arg) => _arg.type==='required');
		if(!canBeLonely && _requiredArgs.length > args.length){
			errors.push(new ParsingErrors.MissingArguments(_requiredArgs.map(_requiredArg => _requiredArg.name),args));
		}
		let numberOfFillableOptionalArgs = args.length - _requiredArgs.length;
		const argumentObject:any = {};
		let argI = 0;
		argLoop: for(let _arg of this._arguments){
			if(typeof args[argI] === 'undefined') break argLoop;
			if(_arg.type==='optional'){
				if(numberOfFillableOptionalArgs<=0){
					continue;
				}else{
					numberOfFillableOptionalArgs--;
				}
			}
			argumentObject[_arg.name] = args[argI];
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