const path = require('path');

module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  
  entry: {
    ui: './ui.tsx',
    code: './code.ts',
  },
  
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.module\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]__[local]___[hash:base64:5]',
              },
            },
          },
        ],
      },
      {
        test: /\.css$/,
        exclude: /\.module\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
};
