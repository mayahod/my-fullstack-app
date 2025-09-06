# React Client - Built with Vite ⚡

This is the frontend client for the QueenB Summer Project Template, built with React and Vite for fast development and optimal performance.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en) (version 20.x or higher)
- npm (version 10.x or higher)

### Installation

1. **Navigate to the client directory**:
```bash
cd client
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
   - Create a `.env` file in the client directory
   - Copy contents from `.env.example`
   - Update `VITE_API_URL` to match your backend server URL

## 📜 Available Scripts

In the client directory, you can run:

### `npm run dev`

Runs the app in development mode with Vite's fast hot module replacement.  
Open [http://localhost:5173](http://localhost:5173) to view it in your browser.

The page will reload instantly when you make changes, and you'll see any lint errors in the console.

### `npm run build`

Builds the app for production to the `dist` folder.  
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.  
Your app is ready to be deployed!

### `npm run preview`

Serves the production build locally for testing.  
Run this after `npm run build` to preview the optimized production build.

### `npm run lint`

Runs ESLint to check for code quality issues and enforce coding standards.

## 🏗️ Built With

- **[React](https://reactjs.org/)** - A JavaScript library for building user interfaces
- **[Vite](https://vitejs.dev/)** - Next generation frontend tooling for fast development
- **[React Router](https://reactrouter.com/)** - Declarative routing for React
- **[Axios](https://axios-http.com/)** - Promise-based HTTP client

## 🎯 Key Features

- **⚡ Lightning Fast** - Vite's instant server start and HMR
- **🎨 Component-Based Architecture** - Reusable and maintainable React components
- **🛣️ Client-Side Routing** - Smooth navigation with React Router
- **📱 Responsive Design** - Works on desktop and mobile devices
- **🔧 Modern Development** - ESLint, modern JavaScript features, and CSS modules

## 📁 Project Structure

```
client/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── common/       # Shared components (buttons, forms, etc.)
│   │   └── RandomDuck/   # Feature-specific components
│   ├── context/          # React Context providers
│   ├── pages/            # Page-level components
│   ├── services/         # API services and utilities
│   ├── styles/           # Global styles and CSS modules
│   ├── App.jsx           # Main app component with routing
│   └── main.jsx          # Application entry point
├── index.html            # HTML template
├── vite.config.js        # Vite configuration
├── package.json          # Dependencies and scripts
└── .env.example          # Environment variables template
```

## 🌐 Environment Variables

Create a `.env` file in the client directory and set:

```env
VITE_API_URL=/api
```

**Note**: With Vite, environment variables must be prefixed with `VITE_` to be accessible in the browser.

## 💡 Modern React Practices

This project uses modern React development practices:

- **No React Imports Required**: Modern React with JSX transformation
- **Functional Components with Hooks**: useState, useEffect, useContext
- **CSS Modules**: Scoped styling for components
- **PropTypes Disabled**: Using TypeScript-style development without runtime prop validation

## 🔧 Development Tips

- Use `Ctrl + C` to stop the development server
- Vite provides excellent error overlays and debugging information
- Hot module replacement preserves component state during development
- Check the browser console for any runtime errors or warnings

## 🚀 Deployment

After running `npm run build`, the `dist` folder will contain your optimized production build ready for deployment to any static hosting service.

Popular deployment options:
- [Vercel](https://vercel.com/)
- [Netlify](https://netlify.com/)
- [GitHub Pages](https://pages.github.com/)

## 📚 Learn More

- [Vite Documentation](https://vitejs.dev/guide/)
- [React Documentation](https://reactjs.org/docs/)
- [React Router Documentation](https://reactrouter.com/docs/)

## 🆘 Troubleshooting

- **Port already in use**: Change the port in `vite.config.js` or kill the process using port 5173
- **API connection issues**: Verify `VITE_API_URL` in your `.env` file matches your backend server
- **Build errors**: Check the console for specific error messages and ensure all imports are correct

Happy coding! 🎉