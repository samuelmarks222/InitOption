CREATE TABLE IF NOT EXISTS public.crypto_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    network TEXT NOT NULL,
    wallet_address TEXT,
    qr_code_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.crypto_payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on crypto methods" ON public.crypto_payment_methods FOR SELECT USING (status = 'active');
CREATE POLICY "Allow admin full access on crypto methods" ON public.crypto_payment_methods FOR ALL USING (has_role('admin', auth.uid()));

-- Insert 20 crypto coins with placeholder wallet addresses
INSERT INTO public.crypto_payment_methods (coin_name, symbol, network, wallet_address) VALUES
('Bitcoin', 'BTC', 'Bitcoin', 'bc1q_placeholder_btc_address'),
('Ethereum', 'ETH', 'ERC20', '0x_placeholder_eth_address'),
('Tether USD', 'USDT', 'TRC20', 'T_placeholder_usdt_trc20_address'),
('Tether USD', 'USDT', 'ERC20', '0x_placeholder_usdt_erc20_address'),
('Binance Coin', 'BNB', 'BEP20', '0x_placeholder_bnb_address'),
('Solana', 'SOL', 'Solana', 'sol_placeholder_address'),
('XRP', 'XRP', 'Ripple', 'r_placeholder_xrp_address'),
('USD Coin', 'USDC', 'ERC20', '0x_placeholder_usdc_erc20_address'),
('USD Coin', 'USDC', 'TRC20', 'T_placeholder_usdc_trc20_address'),
('Cardano', 'ADA', 'Cardano', 'addr1_placeholder_ada_address'),
('Avalanche', 'AVAX', 'C-Chain', '0x_placeholder_avax_address'),
('Dogecoin', 'DOGE', 'Dogecoin', 'D_placeholder_doge_address'),
('Polkadot', 'DOT', 'Polkadot', '1_placeholder_dot_address'),
('Polygon', 'MATIC', 'Polygon', '0x_placeholder_matic_address'),
('Litecoin', 'LTC', 'Litecoin', 'L_placeholder_ltc_address'),
('Shiba Inu', 'SHIB', 'ERC20', '0x_placeholder_shib_address'),
('TRON', 'TRX', 'TRC20', 'T_placeholder_trx_address'),
('Chainlink', 'LINK', 'ERC20', '0x_placeholder_link_address'),
('Uniswap', 'UNI', 'ERC20', '0x_placeholder_uni_address'),
('Toncoin', 'TON', 'TON', 'EQ_placeholder_ton_address');
