const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const createToken = (user, secret, expiresIn) => {
    const { username, email } = user;
    return jwt.sign({ username, email }, secret, { expiresIn })
};

exports.resolvers = {
    Query: {
        getAllRecipes: async (root, args, { Recipe }) => await Recipe.find().sort({ createdDate: 'desc' }),
        getRecipe: async (root, { _id }, { Recipe }) => await Recipe.findOne({ _id }),
        searchRecipes: async (root, { searchTemp }, { Recipe }) => {
            if (searchTemp) {
                return await Recipe.find({ $text: { $search: searchTemp }}, { $score: { $meta: "textScore" }},)
                .sort({ $score: { $meta: "textScore" } });
            } else {
                return await Recipe.find().sort({ likes: 'desc', createdDate: 'desc' });
            }
        },
        getCurrentUser: async (root, args, { currentUser, User }) => {
            if (!currentUser) return null;
            return await User.findOne({ username: currentUser.username }).populate({
                path: 'favorites',
                model: 'Recipe'
            });
        },
        getUserRecipes: async (root, { username }, { Recipe }) => {
            return await Recipe.find({ username }).sort({ createdDate: 'desc' });
        }
    },
    Mutation: {
        addRecipe: async (root, { name, description, category, instructions, username }, { Recipe }) => {
            return await new Recipe({ name, category, description, instructions, username }).save();
        },
        deleteUserRecipe: async (root, { _id }, { Recipe }) => {
            return await Recipe.findOneAndRemove({ _id });
        },
        likeRecipe: async (root, { _id, username }, { Recipe, User }) => {
            const recipe = await Recipe.findOneAndUpdate({ _id }, { $inc: { likes: 1 }});
            const user = await User.findOneAndUpdate({ username }, { $addToSet: { favorites: _id }});
            return recipe;
        },
        unlikeRecipe: async (root, { _id, username }, { Recipe, User }) => {
            const recipe = await Recipe.findOneAndUpdate({ _id }, { $inc: { likes: -1 }});
            const user = await User.findOneAndUpdate({ username }, { $pull: { favorites: _id }});
            return recipe;
        },
        signinUser: async (root, { username, password }, { User }) => {
            const user = await User.findOne({ username });
            if (!user) {
                throw new Error('Use  not found');
            }
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                throw new Error('Invalid password');
            }
            return { token: createToken(user, process.env.SECRET, '1hr') };
        },
        signupUser: async (root, { username, email, password }, { User }) => {
            const user = await User.findOne({ username });
            if (user) {
                throw new Error('Use  already exists');
            }
            const newUser = await new User({ username, email, password }).save();
            return { token: createToken(newUser, process.env.SECRET, '1hr') };
        }
    }
};