{
  # Override nixpkgs to use the latest set of node packages
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/5e05bf13858a4240d99190b9fd651a25b696c651";
  inputs.systems.url = "github:nix-systems/default";

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    systems,
  }:
    flake-utils.lib.eachSystem (import systems)
    (system: let
      pkgs = import nixpkgs {
        inherit system;
      };
    in {
      devShells.default = pkgs.mkShell {
        buildInputs = [
          pkgs.nodejs-18_x
          pkgs.playwright-test
          pkgs.yarn
          pkgs.nodePackages.typescript
          pkgs.nodePackages.typescript-language-server
        ];
        shellHook = ''
          # Remove playwright from node_modules, so it will be taken from playwright-test
          rm node_modules/@playwright/ -R
          rm node_modules/playwright-core/ -R
        '';
      };
    });
}

