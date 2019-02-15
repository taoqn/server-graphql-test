const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const { graphiqlExpress, graphqlExpress } = require('apollo-server-express');
const { makeExecutableSchema } = require('graphql-tools');

const { typeDefs } = require('./schema');
const { resolvers } = require('./resolvers');

// Create Schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Modles
const Recipe = require('./models/Recipe');
const User = require('./models/User');

// Import .env
require('dotenv').config({ path: "variables.env" });

// Connects to database
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("DB connected"))
    .catch(err => console.log(err));

// Initializes application
const app = express();

// Cross-Origin
app.use(cors({ origin: process.env.CROSS_ORIGIN, credentials: true }));

// Set up JWT authentication middleware
app.use(async (req, res, next) => {
    const token = req.headers['authorization'];
    // console.log(token, typeof token);
    if (token !== "null") {
        try {
            const currentUser = await jwt.verify(token, process.env.SECRET);
            req.currentUser = currentUser;
            console.log(currentUser);
        } catch (err) {
            console.error(err);
        }
    }
    next();
});

// Create GraphQL application
app.use('/graphiql', graphiqlExpress({ endpointURL: '/graphql' }));

// Connect schema to GraphQL
app.use(
    '/graphql',
    bodyParser.json(),
    graphqlExpress(({ currentUser }) => ({ schema, context: { Recipe, User, currentUser }}))
);

if(process.env.NODE_ENV === 'production') {
	app.use(express.static('client/build'));
	app.get('*', (req, res) => {
		res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
	})
}

// Port
const PORT = process.env.PORT || 4444;

app.listen(PORT, () => { console.log(`Server listening on PORT ${PORT}`); });