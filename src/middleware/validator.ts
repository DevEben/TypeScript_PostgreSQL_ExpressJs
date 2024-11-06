import Joi, { ObjectSchema, ValidationResult } from '@hapi/joi';

interface UserData {
    username: string;
    email: string;
    password: string;
}

interface ResetPasswordData {
    password: string;
    confirmPassword: string;
}

const validateUser = (data: UserData): ValidationResult => {
    const userValidationSchema: ObjectSchema<UserData> = Joi.object({
        username: Joi.string().min(3).required().messages({
            "string.min": "Username must be at least 3 characters long",
            "any.required": "Username is required",
        }),
        email: Joi.string().email().required().messages({
            "string.email": "Please provide a valid email address",
            "any.required": "Email is required",
        }),
        password: Joi.string().min(6).required().messages({
            "string.min": "Password must be at least 6 characters long",
            "any.required": "Password is required",
        }),
    });

    return userValidationSchema.validate(data, { abortEarly: false });
};

const validateResetPassword = (data: ResetPasswordData): ValidationResult => {
    const validateSchema: ObjectSchema<ResetPasswordData> = Joi.object({
        password: Joi.string()
            .min(8)
            .max(20)
            .pattern(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/))
            .required()
            .messages({
                "string.min": "Password must be at least 8 characters long",
                "string.max": "Password must not exceed 20 characters",
                "string.pattern.base": "Password must contain lowercase, uppercase, numbers, and special characters",
                "any.required": "Password field can't be left empty",
            }),
        confirmPassword: Joi.string()
            .min(8)
            .max(20)
            .pattern(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/))
            .required()
            .messages({
                "string.min": "Confirm Password must be at least 8 characters long",
                "string.max": "Confirm Password must not exceed 20 characters",
                "string.pattern.base": "Confirm Password must contain lowercase, uppercase, numbers, and special characters",
                "any.required": "Confirm Password field can't be left empty",
            }),
    }).custom((data, helpers) => {
        if (data.password !== data.confirmPassword) {
            return helpers.message({ custom: "Password and Confirm Password must match" });
        }
        return data;
    });

    return validateSchema.validate(data, { abortEarly: false });
};


const validateUpdatedUser = (data: UserData): ValidationResult => {
    const userValidationSchema: ObjectSchema<UserData> = Joi.object({
        username: Joi.string().min(3).messages({
            "string.min": "Username must be at least 3 characters long",
            "any.required": "Username is required",
        }),
        email: Joi.string().email().messages({
            "string.email": "Please provide a valid email address",
            "any.required": "Email is required",
        }),
        password: Joi.string().min(6).messages({
            "string.min": "Password must be at least 6 characters long",
            "any.required": "Password is required",
        }),
    });

    return userValidationSchema.validate(data, { abortEarly: false });
};


export { validateUser, validateResetPassword, validateUpdatedUser, };
